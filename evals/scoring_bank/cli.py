"""
CLI entry point for the quality scoring bank.

Usage
-----
    # Record a new score
    python -m scoring_bank record \\
        --task-id <uuid> \\
        --task-identifier APR-123 \\
        --model-id claude-sonnet-4-6 \\
        --complexity 3 \\
        --quality 4.0 \\
        --success \\
        --revision-cycles 1 \\
        [--reassigned] \\
        [--human-review-score 4] \\
        [--notes "LGTM, minor nits"]

    # Query entries
    python -m scoring_bank query [--model-id claude-sonnet-4-6] [--complexity 3]

    # Aggregate statistics
    python -m scoring_bank aggregate --by model
    python -m scoring_bank aggregate --by complexity

    # Export all entries as JSON array
    python -m scoring_bank export
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

from .bank import ScoringBank
from .schema import ScoringEntry


def _make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="scoring_bank",
        description="Quality scoring bank CLI",
    )
    parser.add_argument(
        "--data-path",
        default=None,
        help="Path to the JSONL data file (default: scoring_bank/data/scores.jsonl)",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # record
    rec = sub.add_parser("record", help="Record a new quality score entry")
    rec.add_argument("--task-id", required=True)
    rec.add_argument("--task-identifier", required=True)
    rec.add_argument("--model-id", required=True)
    rec.add_argument("--complexity", type=int, required=True, choices=range(1, 6))
    rec.add_argument("--quality", type=float, required=True)
    rec.add_argument("--success", action="store_true", default=False)
    rec.add_argument("--no-success", dest="success", action="store_false")
    rec.add_argument("--revision-cycles", type=int, default=0)
    rec.add_argument("--reassigned", action="store_true", default=False)
    rec.add_argument("--human-review-score", type=float, default=None)
    rec.add_argument("--notes", default="")

    # query
    qry = sub.add_parser("query", help="Query entries from the scoring bank")
    qry.add_argument("--model-id", default=None)
    qry.add_argument("--min-complexity", type=int, default=None)
    qry.add_argument("--max-complexity", type=int, default=None)
    qry.add_argument("--success-only", action="store_true", default=False)

    # aggregate
    agg = sub.add_parser("aggregate", help="Show aggregated statistics")
    agg.add_argument("--by", choices=["model", "complexity"], required=True)

    # model-quality (for selection engine integration)
    mq = sub.add_parser(
        "model-quality",
        help="Show average quality scores per model at a complexity tier",
    )
    mq.add_argument("--complexity", type=int, required=True, choices=range(1, 6))

    # export
    sub.add_parser("export", help="Export all entries as a JSON array")

    return parser


def main(argv: Optional[list[str]] = None) -> int:
    parser = _make_parser()
    args = parser.parse_args(argv)

    bank = ScoringBank(data_path=args.data_path)

    if args.command == "record":
        entry = ScoringEntry(
            task_id=args.task_id,
            task_identifier=args.task_identifier,
            model_id=args.model_id,
            complexity_score=args.complexity,
            quality_score=args.quality,
            task_success=args.success,
            revision_cycles=args.revision_cycles,
            was_reassigned=args.reassigned,
            human_review_score=args.human_review_score,
            eval_notes=args.notes,
        )
        bank.record(entry)
        print(f"Recorded score for {args.task_identifier} ({args.model_id})")

    elif args.command == "query":
        entries = bank.query(
            model_id=args.model_id,
            min_complexity=args.min_complexity,
            max_complexity=args.max_complexity,
            task_success=True if args.success_only else None,
        )
        print(json.dumps([e.to_dict() for e in entries], indent=2))

    elif args.command == "aggregate":
        if args.by == "model":
            stats = bank.aggregate_by_model()
            out = {
                k: {
                    "entry_count": v.entry_count,
                    "avg_quality_score": round(v.avg_quality_score, 3),
                    "avg_complexity_score": round(v.avg_complexity_score, 3),
                    "success_rate": round(v.success_rate, 3),
                    "avg_revision_cycles": round(v.avg_revision_cycles, 3),
                }
                for k, v in stats.items()
            }
        else:
            stats = bank.aggregate_by_complexity()
            out = {
                str(k): {
                    "entry_count": v.entry_count,
                    "avg_quality_score": round(v.avg_quality_score, 3),
                    "success_rate": round(v.success_rate, 3),
                    "avg_revision_cycles": round(v.avg_revision_cycles, 3),
                    "top_model": v.top_model,
                }
                for k, v in sorted(stats.items())
            }
        print(json.dumps(out, indent=2))

    elif args.command == "model-quality":
        result = bank.model_quality_for_complexity(args.complexity)
        print(json.dumps({k: round(v, 3) for k, v in result.items()}, indent=2))

    elif args.command == "export":
        entries = bank.load_all()
        print(json.dumps([e.to_dict() for e in entries], indent=2))

    return 0


if __name__ == "__main__":
    sys.exit(main())
