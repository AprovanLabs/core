"""Unit tests for the quality scoring bank."""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from scoring_bank import ScoringBank, ScoringEntry
from scoring_bank.cli import main as cli_main


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def tmp_bank(tmp_path) -> ScoringBank:
    return ScoringBank(data_path=tmp_path / "scores.jsonl")


def _make_entry(**overrides) -> ScoringEntry:
    defaults = dict(
        task_id="11111111-0000-0000-0000-000000000001",
        task_identifier="APR-1",
        model_id="claude-sonnet-4-6",
        complexity_score=3,
        quality_score=4.0,
        task_success=True,
        revision_cycles=1,
        was_reassigned=False,
        eval_notes="looks good",
    )
    defaults.update(overrides)
    return ScoringEntry(**defaults)


# ---------------------------------------------------------------------------
# ScoringEntry serialisation
# ---------------------------------------------------------------------------


def test_entry_roundtrip_json():
    entry = _make_entry()
    restored = ScoringEntry.from_json(entry.to_json())
    assert restored.task_id == entry.task_id
    assert restored.quality_score == entry.quality_score
    assert restored.task_success == entry.task_success
    assert restored.human_review_score is None


def test_entry_roundtrip_dict():
    entry = _make_entry(human_review_score=5.0)
    restored = ScoringEntry.from_dict(entry.to_dict())
    assert restored.human_review_score == 5.0


def test_entry_recorded_at_default():
    entry = _make_entry()
    assert entry.recorded_at  # non-empty
    assert "T" in entry.recorded_at  # ISO-8601 includes "T"


# ---------------------------------------------------------------------------
# ScoringBank basic write / read
# ---------------------------------------------------------------------------


def test_record_and_load(tmp_bank):
    tmp_bank.record(_make_entry(task_identifier="APR-1"))
    tmp_bank.record(_make_entry(task_identifier="APR-2"))
    entries = tmp_bank.load_all()
    assert len(entries) == 2
    assert entries[0].task_identifier == "APR-1"
    assert entries[1].task_identifier == "APR-2"


def test_bank_creates_data_file_if_missing(tmp_path):
    bank = ScoringBank(data_path=tmp_path / "sub" / "scores.jsonl")
    bank.record(_make_entry())
    assert (tmp_path / "sub" / "scores.jsonl").exists()


def test_load_empty_bank(tmp_bank):
    assert tmp_bank.load_all() == []


def test_bank_is_append_only(tmp_bank):
    tmp_bank.record(_make_entry(task_identifier="APR-1"))
    tmp_bank.record(_make_entry(task_identifier="APR-2"))
    # Second bank instance reads the same file
    bank2 = ScoringBank(data_path=tmp_bank._path)
    entries = bank2.load_all()
    assert len(entries) == 2


# ---------------------------------------------------------------------------
# ScoringBank.query
# ---------------------------------------------------------------------------


def test_query_by_model(tmp_bank):
    tmp_bank.record(_make_entry(model_id="model-a"))
    tmp_bank.record(_make_entry(model_id="model-b"))
    tmp_bank.record(_make_entry(model_id="model-a"))
    results = tmp_bank.query(model_id="model-a")
    assert len(results) == 2
    assert all(e.model_id == "model-a" for e in results)


def test_query_by_complexity_range(tmp_bank):
    for c in [1, 2, 3, 4, 5]:
        tmp_bank.record(_make_entry(complexity_score=c))
    results = tmp_bank.query(min_complexity=2, max_complexity=4)
    assert len(results) == 3
    assert all(2 <= e.complexity_score <= 4 for e in results)


def test_query_task_success_filter(tmp_bank):
    tmp_bank.record(_make_entry(task_success=True))
    tmp_bank.record(_make_entry(task_success=False))
    successes = tmp_bank.query(task_success=True)
    failures = tmp_bank.query(task_success=False)
    assert len(successes) == 1
    assert len(failures) == 1


def test_query_no_filters_returns_all(tmp_bank):
    for _ in range(5):
        tmp_bank.record(_make_entry())
    assert len(tmp_bank.query()) == 5


# ---------------------------------------------------------------------------
# ScoringBank.aggregate_by_model
# ---------------------------------------------------------------------------


def test_aggregate_by_model(tmp_bank):
    tmp_bank.record(_make_entry(model_id="fast", quality_score=3.0, task_success=True, revision_cycles=0))
    tmp_bank.record(_make_entry(model_id="fast", quality_score=5.0, task_success=True, revision_cycles=2))
    tmp_bank.record(_make_entry(model_id="slow", quality_score=4.0, task_success=False, revision_cycles=1))

    stats = tmp_bank.aggregate_by_model()
    assert "fast" in stats
    assert stats["fast"].entry_count == 2
    assert stats["fast"].avg_quality_score == pytest.approx(4.0)
    assert stats["fast"].success_rate == pytest.approx(1.0)
    assert stats["fast"].avg_revision_cycles == pytest.approx(1.0)
    assert stats["slow"].success_rate == pytest.approx(0.0)


def test_aggregate_by_model_empty(tmp_bank):
    assert tmp_bank.aggregate_by_model() == {}


# ---------------------------------------------------------------------------
# ScoringBank.aggregate_by_complexity
# ---------------------------------------------------------------------------


def test_aggregate_by_complexity(tmp_bank):
    tmp_bank.record(_make_entry(complexity_score=2, model_id="budget", quality_score=4.0, task_success=True))
    tmp_bank.record(_make_entry(complexity_score=2, model_id="budget", quality_score=2.0, task_success=False))
    tmp_bank.record(_make_entry(complexity_score=5, model_id="frontier", quality_score=5.0, task_success=True))

    stats = tmp_bank.aggregate_by_complexity()
    assert 2 in stats
    assert stats[2].entry_count == 2
    assert stats[2].avg_quality_score == pytest.approx(3.0)
    assert stats[2].success_rate == pytest.approx(0.5)
    assert stats[2].top_model == "budget"
    assert stats[5].top_model == "frontier"


# ---------------------------------------------------------------------------
# ScoringBank.model_quality_for_complexity
# ---------------------------------------------------------------------------


def test_model_quality_for_complexity(tmp_bank):
    tmp_bank.record(_make_entry(complexity_score=3, model_id="mid", quality_score=3.0))
    tmp_bank.record(_make_entry(complexity_score=3, model_id="mid", quality_score=5.0))
    tmp_bank.record(_make_entry(complexity_score=3, model_id="frontier", quality_score=4.0))
    tmp_bank.record(_make_entry(complexity_score=4, model_id="mid", quality_score=2.0))  # different tier

    result = tmp_bank.model_quality_for_complexity(3)
    assert result["mid"] == pytest.approx(4.0)
    assert result["frontier"] == pytest.approx(4.0)
    assert "mid" in result and "frontier" in result
    # Tier-4 entry should not appear in tier-3 result
    assert len(result) == 2


def test_model_quality_for_complexity_empty(tmp_bank):
    assert tmp_bank.model_quality_for_complexity(3) == {}


# ---------------------------------------------------------------------------
# CLI integration
# ---------------------------------------------------------------------------


def test_cli_record(tmp_path, capsys):
    data_file = tmp_path / "scores.jsonl"
    cli_main([
        "--data-path", str(data_file),
        "record",
        "--task-id", "aaaaaaaa-0000-0000-0000-000000000001",
        "--task-identifier", "APR-99",
        "--model-id", "deepseek-v3",
        "--complexity", "2",
        "--quality", "3.5",
        "--success",
        "--revision-cycles", "0",
    ])
    captured = capsys.readouterr()
    assert "APR-99" in captured.out
    # Verify file was written
    lines = data_file.read_text().strip().splitlines()
    assert len(lines) == 1
    entry_data = json.loads(lines[0])
    assert entry_data["task_identifier"] == "APR-99"
    assert entry_data["model_id"] == "deepseek-v3"
    assert entry_data["task_success"] is True


def test_cli_query(tmp_path, capsys):
    data_file = tmp_path / "scores.jsonl"
    bank = ScoringBank(data_path=data_file)
    bank.record(_make_entry(model_id="test-model", task_identifier="APR-10"))
    bank.record(_make_entry(model_id="other-model", task_identifier="APR-11"))

    cli_main(["--data-path", str(data_file), "query", "--model-id", "test-model"])
    out = json.loads(capsys.readouterr().out)
    assert len(out) == 1
    assert out[0]["task_identifier"] == "APR-10"


def test_cli_aggregate_by_model(tmp_path, capsys):
    data_file = tmp_path / "scores.jsonl"
    bank = ScoringBank(data_path=data_file)
    bank.record(_make_entry(model_id="m1", quality_score=4.0))
    bank.record(_make_entry(model_id="m1", quality_score=2.0))

    cli_main(["--data-path", str(data_file), "aggregate", "--by", "model"])
    out = json.loads(capsys.readouterr().out)
    assert "m1" in out
    assert out["m1"]["avg_quality_score"] == pytest.approx(3.0)


def test_cli_aggregate_by_complexity(tmp_path, capsys):
    data_file = tmp_path / "scores.jsonl"
    bank = ScoringBank(data_path=data_file)
    bank.record(_make_entry(complexity_score=2, quality_score=3.0))

    cli_main(["--data-path", str(data_file), "aggregate", "--by", "complexity"])
    out = json.loads(capsys.readouterr().out)
    assert "2" in out


def test_cli_export(tmp_path, capsys):
    data_file = tmp_path / "scores.jsonl"
    bank = ScoringBank(data_path=data_file)
    bank.record(_make_entry(task_identifier="APR-77"))

    cli_main(["--data-path", str(data_file), "export"])
    out = json.loads(capsys.readouterr().out)
    assert isinstance(out, list)
    assert len(out) == 1
    assert out[0]["task_identifier"] == "APR-77"


def test_cli_model_quality(tmp_path, capsys):
    data_file = tmp_path / "scores.jsonl"
    bank = ScoringBank(data_path=data_file)
    bank.record(_make_entry(complexity_score=4, model_id="frontier", quality_score=5.0))

    cli_main(["--data-path", str(data_file), "model-quality", "--complexity", "4"])
    out = json.loads(capsys.readouterr().out)
    assert "frontier" in out
    assert out["frontier"] == pytest.approx(5.0)
