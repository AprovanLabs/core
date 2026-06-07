"""
ScoringBank — JSONL-backed persistent quality scoring bank.

Records are appended to a .jsonl file (one JSON object per line).
The bank is intentionally append-only: entries are never deleted or modified
in place. Callers that want to supersede a score should append a new entry
with the same task_id; the latest entry wins when aggregating.

Usage
-----
    from scoring_bank.bank import ScoringBank
    from scoring_bank.schema import ScoringEntry

    bank = ScoringBank()
    bank.record(ScoringEntry(
        task_id="...",
        task_identifier="APR-123",
        model_id="claude-sonnet-4-6",
        complexity_score=3,
        quality_score=4.0,
        task_success=True,
        revision_cycles=1,
        was_reassigned=False,
    ))

    # Query
    entries = bank.query(model_id="claude-sonnet-4-6")
    stats = bank.aggregate_by_model()
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from .schema import ScoringEntry

_DEFAULT_DATA_PATH = Path(__file__).parent / "data" / "scores.jsonl"


@dataclass
class ModelStats:
    model_id: str
    entry_count: int
    avg_quality_score: float
    avg_complexity_score: float
    success_rate: float
    avg_revision_cycles: float
    # Cost / usage — only entries with cost_usd populated contribute
    total_cost_usd: float = 0.0
    avg_cost_usd: float = 0.0
    total_tokens_input: int = 0
    total_tokens_output: int = 0


@dataclass
class ComplexityStats:
    complexity_score: int
    entry_count: int
    avg_quality_score: float
    success_rate: float
    avg_revision_cycles: float
    # Most common model used at this complexity tier
    top_model: Optional[str]
    # Cost / usage — only entries with cost_usd populated contribute
    total_cost_usd: float = 0.0
    avg_cost_usd: float = 0.0


@dataclass
class ProviderStats:
    provider: str
    entry_count: int
    total_cost_usd: float
    avg_cost_usd: float
    total_tokens_input: int
    total_tokens_output: int
    success_rate: float


class ScoringBank:
    """Append-only quality scoring bank backed by a JSONL file."""

    def __init__(self, data_path: Optional[Path | str] = None) -> None:
        self._path = Path(data_path) if data_path else _DEFAULT_DATA_PATH
        self._path.parent.mkdir(parents=True, exist_ok=True)
        if not self._path.exists():
            self._path.touch()

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    def record(self, entry: ScoringEntry) -> None:
        """Append a single scoring entry to the bank."""
        with self._path.open("a", encoding="utf-8") as fh:
            fh.write(entry.to_json() + "\n")

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def load_all(self) -> list[ScoringEntry]:
        """Load every entry from the bank (chronological order)."""
        entries: list[ScoringEntry] = []
        if not self._path.exists():
            return entries
        with self._path.open(encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    entries.append(ScoringEntry.from_json(line))
        return entries

    def query(
        self,
        *,
        model_id: Optional[str] = None,
        provider: Optional[str] = None,
        min_complexity: Optional[int] = None,
        max_complexity: Optional[int] = None,
        task_success: Optional[bool] = None,
        was_reassigned: Optional[bool] = None,
    ) -> list[ScoringEntry]:
        """Return entries matching all supplied filters."""
        results = self.load_all()
        if model_id is not None:
            results = [e for e in results if e.model_id == model_id]
        if provider is not None:
            results = [e for e in results if e.provider == provider]
        if min_complexity is not None:
            results = [e for e in results if e.complexity_score >= min_complexity]
        if max_complexity is not None:
            results = [e for e in results if e.complexity_score <= max_complexity]
        if task_success is not None:
            results = [e for e in results if e.task_success == task_success]
        if was_reassigned is not None:
            results = [e for e in results if e.was_reassigned == was_reassigned]
        return results

    # ------------------------------------------------------------------
    # Aggregations
    # ------------------------------------------------------------------

    def aggregate_by_model(self) -> dict[str, ModelStats]:
        """Return per-model statistics across all entries."""
        buckets: dict[str, list[ScoringEntry]] = {}
        for entry in self.load_all():
            buckets.setdefault(entry.model_id, []).append(entry)

        stats: dict[str, ModelStats] = {}
        for model_id, entries in buckets.items():
            count = len(entries)
            costed = [e for e in entries if e.cost_usd is not None]
            total_cost = sum(e.cost_usd for e in costed)  # type: ignore[misc]
            stats[model_id] = ModelStats(
                model_id=model_id,
                entry_count=count,
                avg_quality_score=sum(e.quality_score for e in entries) / count,
                avg_complexity_score=sum(e.complexity_score for e in entries) / count,
                success_rate=sum(1 for e in entries if e.task_success) / count,
                avg_revision_cycles=sum(e.revision_cycles for e in entries) / count,
                total_cost_usd=total_cost,
                avg_cost_usd=total_cost / len(costed) if costed else 0.0,
                total_tokens_input=sum(e.tokens_input or 0 for e in entries),
                total_tokens_output=sum(e.tokens_output or 0 for e in entries),
            )
        return stats

    def aggregate_by_complexity(self) -> dict[int, ComplexityStats]:
        """Return per-complexity-tier statistics across all entries."""
        buckets: dict[int, list[ScoringEntry]] = {}
        for entry in self.load_all():
            buckets.setdefault(entry.complexity_score, []).append(entry)

        stats: dict[int, ComplexityStats] = {}
        for complexity, entries in buckets.items():
            count = len(entries)
            model_counts: dict[str, int] = {}
            for e in entries:
                model_counts[e.model_id] = model_counts.get(e.model_id, 0) + 1
            top_model = max(model_counts, key=lambda m: model_counts[m]) if model_counts else None
            costed = [e for e in entries if e.cost_usd is not None]
            total_cost = sum(e.cost_usd for e in costed)  # type: ignore[misc]
            stats[complexity] = ComplexityStats(
                complexity_score=complexity,
                entry_count=count,
                avg_quality_score=sum(e.quality_score for e in entries) / count,
                success_rate=sum(1 for e in entries if e.task_success) / count,
                avg_revision_cycles=sum(e.revision_cycles for e in entries) / count,
                top_model=top_model,
                total_cost_usd=total_cost,
                avg_cost_usd=total_cost / len(costed) if costed else 0.0,
            )
        return stats

    def aggregate_by_provider(self) -> dict[str, ProviderStats]:
        """Return per-provider cost and usage statistics across all entries.

        Only entries with a non-None ``provider`` field are included.
        Cost and token fields default to 0 when not populated on individual entries.
        """
        buckets: dict[str, list[ScoringEntry]] = {}
        for entry in self.load_all():
            if entry.provider is not None:
                buckets.setdefault(entry.provider, []).append(entry)

        stats: dict[str, ProviderStats] = {}
        for provider, entries in buckets.items():
            count = len(entries)
            total_cost = sum(e.cost_usd or 0.0 for e in entries)
            stats[provider] = ProviderStats(
                provider=provider,
                entry_count=count,
                total_cost_usd=total_cost,
                avg_cost_usd=total_cost / count,
                total_tokens_input=sum(e.tokens_input or 0 for e in entries),
                total_tokens_output=sum(e.tokens_output or 0 for e in entries),
                success_rate=sum(1 for e in entries if e.task_success) / count,
            )
        return stats

    def model_quality_for_complexity(
        self, complexity_score: int
    ) -> dict[str, float]:
        """
        Return average quality score per model at a specific complexity tier.

        Useful for the model selection engine to pick the best-performing model
        for a given complexity level.
        """
        entries = self.query(min_complexity=complexity_score, max_complexity=complexity_score)
        model_scores: dict[str, list[float]] = {}
        for e in entries:
            model_scores.setdefault(e.model_id, []).append(e.quality_score)
        return {
            model_id: sum(scores) / len(scores)
            for model_id, scores in model_scores.items()
        }
