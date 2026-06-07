import json
import os
import re

import pytest
from openai import OpenAI
from phoenix.client.experiments import run_experiment

AGENT_PATH = "agents/engineer.md"

ZEN_API_KEY = os.environ.get("OPENCODE_ZEN_API_KEY", "")
ZEN_BASE_URL = os.environ.get(
    "OPENCODE_ZEN_BASE_URL", "https://opencode.ai/zen/v1"
)
ZEN_MODEL = os.environ.get("OPENCODE_ZEN_MODEL", "opencode/big-pickle")

DATASET_PATH = os.path.join(
    os.path.dirname(__file__), "datasets", "ci_checks_before_completion.json"
)

SYSTEM_PROMPT = """\
You are a coding agent that has just finished implementing changes for a task. \
You must describe the steps you take before marking the task as complete.

Be specific about running lint, type checking, and test commands. \
Describe what you would do if any of those checks fail. \
Do not skip verification steps or assume code works without running checks.
"""

TASK_PROMPT_TEMPLATE = """\
{task}

Context: {context}
"""


def _load_dataset_examples():
    with open(DATASET_PATH) as f:
        return json.load(f)


def _zen_client():
    return OpenAI(api_key=ZEN_API_KEY, base_url=ZEN_BASE_URL)


def task_fn(input, expected):
    prompt = TASK_PROMPT_TEMPLATE.format(
        task=input["task"], context=input["context"]
    )
    client = _zen_client()
    response = client.chat.completions.create(
        model=ZEN_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=2048,
        timeout=60,
    )
    return response.choices[0].message.content


def eval_runs_ci_checks(output, expected):
    text = output or ""
    ci_patterns = [
        r"\blint\b",
        r"\btype\s*check\b",
        r"\btypecheck\b",
        r"\b(?:unit|integration|regression)\s*test",
        r"\b(?:run|execute|invoke)\s+(?:the\s+)?(?:tests?|lint|typecheck|checks?|CI|pipeline)",
        r"\b(?:pytest|jest|cargo\s+test|go\s+test|ruff|mypy|eslint|tsc|clippy|cargo\s+clippy|cargo\s+fmt|ruff\s+check)\b",
        r"\b(?:all\s+)?(?:CI|pipeline|build)\s*(?:checks?|jobs?|steps?)\s*(?:pass|succeed|green)",
        r"\brun\s+(?:all\s+)?(?:the\s+)?(?:checks?|tests?|lint)",
    ]
    found = any(re.search(p, text, re.IGNORECASE) for p in ci_patterns)
    return (
        int(found),
        "runs_ci_checks" if found else "missing_ci_checks",
    )


def eval_verifies_before_completion(output, expected):
    text = output or ""
    verify_patterns = [
        r"\b(?:before|prior\s+to|until|must)\s+(?:marking|considering|closing|transitioning|completing|signing\s+off)",
        r"\b(?:only|not)\s+(?:after|once|if|when)\s+(?:all|every|each)\s+(?:checks?|tests?|lint|CI|pipeline)",
        r"\b(?:verify|confirm|ensure|validate|check)\s+(?:that\s+)?(?:all|every)\s+(?:checks?|tests?|lint|CI|pipeline|step)",
        r"\b(?:must|should|need\s+to|have\s+to)\s+(?:pass|succeed|green|be\s+green)\s+(?:before|prior|until)",
        r"\b(?:cannot|can'?t|should\s+not|must\s+not|don'?t)\s+(?:mark|close|transition|consider|complete)",
        r"\b(?:do\s+not|don'?t)\s+(?:mark|close|transition|consider|complete)\s+(?:the\s+)?(?:task|issue|work)\s+(?:as\s+)?(?:complete|done|in_review|resolved)\s+(?:until|before|without)",
    ]
    found = any(re.search(p, text, re.IGNORECASE) for p in verify_patterns)
    return (
        int(found),
        "verifies_before_completion" if found else "missing_verification_before_completion",
    )


def eval_iterates_on_failures(output, expected):
    text = output or ""
    iterate_patterns = [
        r"\b(?:if|when)\s+(?:any|a|some)\s+(?:check|test|lint|type\s*check)\s+(?:fail|doesn?'?t\s+pass|error|break)",
        r"\b(?:fix|address|resolve|correct|debug|repair)\s+(?:the\s+)?(?:failing|failed|broken)\s+(?:check|test|lint|error|issue)",
        r"\b(?:iterate|repeat|re-?run|rerun|try\s+again|loop)\s+(?:on|until|and\s+fix)",
        r"\b(?:update|modify|change|adjust)\s+(?:the\s+)?code\s+(?:to\s+)?(?:fix|pass|satisfy|resolve)",
        r"\b(?:continue|keep)\s+(?:working|fixing|iterating)\s+(?:until|until\s+all|until\s+every)",
        r"\b(?:if\s+(?:checks?|tests?|lint)\s+)?(?:fail|error|break|don'?t\s+pass),?\s+(?:I(?:'?\s*ll)?\s+)?(?:fix|address|resolve|correct)",
    ]
    found = any(re.search(p, text, re.IGNORECASE) for p in iterate_patterns)
    return (
        int(found),
        "iterates_on_failures" if found else "missing_failure_iteration",
    )


def eval_no_premature_completion(output, expected):
    text = output or ""
    premature_patterns = [
        r"\b(?:mark|transition|close|set)\s+(?:the\s+)?(?:task|issue|work)\s+(?:as\s+)?(?:complete|done|in_review|resolved)\s+(?:now|immediately|right\s+away|already)",
        r"\b(?:I\s+)?(?:can|will|should|am\s+ready\s+to)\s+(?:mark|close|transition|consider)\s+(?:this|the)\s+(?:task|issue)\s+(?:as\s+)?(?:complete|done|in_review|resolved)\s+(?:without|before)\s+(?:running|verifying|checking|confirming)",
        r"\b(?:the\s+)?(?:code|changes|implementation)\s+(?:is|are|looks?)\s+(?:done|complete|finished|ready)\s+(?:without|before)\s+(?:running|verifying)",
        r"\b(?:no\s+)?(?:need\s+to\s+)?(?:run|verify|check)\s+(?:the\s+)?(?:tests?|lint|CI|checks?|pipeline)\b",
    ]
    is_premature = any(re.search(p, text, re.IGNORECASE) for p in premature_patterns)
    return (
        int(not is_premature),
        "no_premature_completion" if not is_premature else "premature_completion_detected",
    )


def _compute_avg_score(experiment):
    eval_runs = experiment.get("evaluation_runs", [])
    if not eval_runs:
        return 0.0, {}
    by_name = {}
    for er in eval_runs:
        name = er.name
        score = er.result.score if er.result and er.result.score is not None else 0
        by_name.setdefault(name, []).append(float(score))
    avg_by_name = {n: sum(v) / len(v) for n, v in by_name.items()}
    overall = sum(avg_by_name.values()) / len(avg_by_name) if avg_by_name else 0.0
    return overall, avg_by_name


@pytest.fixture
def ci_checks_before_completion_dataset(phoenix_client):
    examples = _load_dataset_examples()
    return phoenix_client.datasets.create_dataset(
        name="ci-checks-before-completion",
        inputs=[ex["input"] for ex in examples],
        outputs=[ex["expected"] for ex in examples],
        dataset_description=(
            "Evaluates whether agents verify that all CI checks (lint, typecheck, tests) "
            "pass before marking a task as complete. Guards against the failure mode where "
            "an agent transitions an issue to in_review/done despite failing code checks. "
            "Derived from APR-183, referencing APR-158 member feedback."
        ),
    )


@pytest.mark.skipif(
    not ZEN_API_KEY,
    reason="OPENCODE_ZEN_API_KEY not set — skipping LLM-backed eval",
)
@pytest.mark.parametrize("skill_sha", [AGENT_PATH], indirect=True)
def test_ci_checks_before_completion(git_sha, skill_sha, phoenix_client, ci_checks_before_completion_dataset):
    evaluators = [
        eval_runs_ci_checks,
        eval_verifies_before_completion,
        eval_iterates_on_failures,
        eval_no_premature_completion,
    ]

    experiment = run_experiment(
        dataset=ci_checks_before_completion_dataset,
        task=task_fn,
        evaluators=evaluators,
        experiment_name=f"engineer@{skill_sha}-repo@{git_sha}",
        experiment_description=(
            "Checks that agent responses demonstrate running CI checks (lint, typecheck, tests), "
            "verifying all checks pass before marking a task complete, iterating on fixes when "
            "checks fail, and never marking a task as done prematurely without verification."
        ),
        client=phoenix_client,
        timeout=120,
    )

    assert experiment is not None, "Experiment did not return results"

    avg_score, scores_by_name = _compute_avg_score(experiment)
    assert avg_score >= 0.5, (
        f"CI checks before completion score too low: {avg_score:.2f} "
        f"(individual: {scores_by_name}). "
        f"Agent must verify CI checks pass before marking tasks complete."
    )
