"""
Quality scoring bank schema.

Each ScoringEntry captures the quality signals for a single completed task,
keyed by task (issue) and model. The bank accumulates entries over time so
the model selection engine can weight model tiers by observed quality.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Optional


@dataclass
class ScoringEntry:
    """A single quality observation for a completed task."""

    # Task identity
    task_id: str
    """Multica issue UUID (canonical key)."""
    task_identifier: str
    """Human-readable issue key, e.g. APR-123."""

    # Model information
    model_id: str
    """Model that produced the output, e.g. claude-sonnet-4-6."""

    # Complexity and quality scores (1–5 scale)
    complexity_score: int
    """Input complexity assessed before the task (1 = trivial, 5 = highly complex)."""
    quality_score: float
    """Assessed output quality (1 = poor, 5 = excellent)."""

    # Outcome signals
    task_success: bool
    """True if the task ultimately succeeded (PR merged, issue resolved to done)."""
    revision_cycles: int
    """Number of review rounds before acceptance (0 = first-pass accepted)."""
    was_reassigned: bool
    """True if the task was re-assigned to a higher-tier model mid-flight."""

    # Optional human feedback
    human_review_score: Optional[float] = None
    """Explicit score from a human reviewer (1–5), if provided."""
    eval_notes: str = ""
    """Free-text notes from the reviewer or the Eval Checker."""

    # Metadata
    recorded_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    """ISO-8601 timestamp of when this entry was recorded."""

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> ScoringEntry:
        return cls(**d)

    def to_json(self) -> str:
        return json.dumps(self.to_dict())

    @classmethod
    def from_json(cls, s: str) -> ScoringEntry:
        return cls.from_dict(json.loads(s))
