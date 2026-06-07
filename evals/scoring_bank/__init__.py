"""
Quality scoring bank for Aprovan eval ticket flows.

Records quality signals per completed task and model, enabling the model
selection engine (APR-205) to refine complexity → model tier mappings over time.

Quickstart
----------
    from scoring_bank import ScoringBank, ScoringEntry

    bank = ScoringBank()
    bank.record(ScoringEntry(
        task_id="<multica-issue-uuid>",
        task_identifier="APR-123",
        model_id="claude-sonnet-4-6",
        complexity_score=3,
        quality_score=4.0,
        task_success=True,
        revision_cycles=1,
        was_reassigned=False,
    ))

CLI
---
    python -m scoring_bank record --help
    python -m scoring_bank query --model-id claude-sonnet-4-6
    python -m scoring_bank aggregate --by model
"""
from .bank import ScoringBank
from .schema import ScoringEntry

__all__ = ["ScoringBank", "ScoringEntry"]
