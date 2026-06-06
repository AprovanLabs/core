import json
import os
import re

import pytest
from openai import OpenAI
from phoenix.client.experiments import run_experiment

AGENT_PATH = "agents/architect.md"

ZEN_API_KEY = os.environ.get("OPENCODE_ZEN_API_KEY", "")
ZEN_BASE_URL = os.environ.get(
    "OPENCODE_ZEN_BASE_URL", "https://opencode.ai/zen/v1"
)
ZEN_MODEL = os.environ.get("OPENCODE_ZEN_MODEL", "opencode/big-pickle")

DATASET_PATH = os.path.join(
    os.path.dirname(__file__), "datasets", "task_decomposition_subtasks.json"
)

SYSTEM_PROMPT = """\
You are an AI project planner. Given a completed research or architecture document, \
your job is to produce a structured implementation plan broken into discrete subtasks.

For each subtask, provide:
- A clear title
- A scope description and acceptance criteria
- Dependencies on other subtasks (if any)
- The type of engineer best suited for the task

Output the plan as a numbered list of subtasks with these fields. \
Do NOT assign the entire implementation to a single task or engineer. \
Break the work into at least 3 independently implementable subtasks.
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


def eval_has_multiple_subtasks(output, expected):
    text = output or ""
    numbered_items = re.findall(r"^\s*(?:\d+[\.\):]|Step\s*\d+|Subtask\s*\d+|Task\s*\d+)", text, re.MULTILINE | re.IGNORECASE)
    bullet_items = re.findall(r"^\s*[-*]\s+", text, re.MULTILINE)
    heading_sections = re.findall(r"^#{1,3}\s+", text, re.MULTILINE)
    total = max(len(numbered_items), len(bullet_items), len(heading_sections))
    has_enough = total >= 3
    return (
        int(has_enough),
        f"has_{total}_subtasks" if has_enough else f"only_{total}_subtasks",
    )


def eval_has_scope_per_subtask(output, expected):
    text = output or ""
    scope_indicators = re.findall(
        r"(?:scope|acceptance|criteria|deliverable|description|objective|goal|outcome)",
        text,
        re.IGNORECASE,
    )
    has_scope = len(scope_indicators) >= 3
    return (
        int(has_scope),
        f"has_{len(scope_indicators)}_scope_indicators" if has_scope else f"only_{len(scope_indicators)}_scope_indicators",
    )


def eval_has_dependencies(output, expected):
    text = output or ""
    dep_patterns = [
        r"depend(?:ency|encies|s)\s*(?:on|:)",
        r"block(?:ed\s+by|s|er)",
        r"requir(?:es?\s+(?:completion\s+of|that))",
        r"after\s+(?:sub)?task",
        r"prerequisite",
        r"must\s+(?:be\s+)?(?:done|completed|finished)\s+(?:before|first|prior)",
        r"can\s+(?:only\s+)?start\s+(?:after|once|when)",
    ]
    found = any(re.search(p, text, re.IGNORECASE) for p in dep_patterns)
    return (
        int(found),
        "has_dependencies" if found else "missing_dependencies",
    )


def eval_no_monolithic_task(output, expected):
    text = output or ""
    monolithic_patterns = [
        r"(?:implement|build|develop|create)\s+(?:the\s+)?(?:entire|whole|all|complete)\s+(?:application|system|project|product|solution)",
        r"assign\s+(?:all|the\s+entire|this\s+whole)\s+(?:implementation|work|project)\s+to\s+(?:a\s+)?single",
        r"one\s+(?:engineer|developer|agent|person)\s+(?:to\s+)?(?:implement|build|do)\s+(?:all|everything|the\s+whole)",
        r"single\s+(?:task|issue|ticket)\s+(?:for|to)\s+(?:implement|build|handle)\s+(?:all|everything|the\s+whole)",
    ]
    is_monolithic = any(re.search(p, text, re.IGNORECASE) for p in monolithic_patterns)
    return (
        int(not is_monolithic),
        "no_monolithic_task" if not is_monolithic else "monolithic_task_detected",
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
def task_decomposition_dataset(phoenix_client):
    examples = _load_dataset_examples()
    return phoenix_client.datasets.create_dataset(
        name="task-decomposition-subtasks",
        inputs=[ex["input"] for ex in examples],
        outputs=[ex["expected"] for ex in examples],
        dataset_description=(
            "Evaluates whether agents decompose research/planning outputs into "
            "discrete, independently implementable subtasks with scope, acceptance criteria, "
            "and dependencies — rather than assigning monolithic implementation to a single task. "
            "Derived from APR-88: Research/planning outputs must be decomposed into subtasks."
        ),
    )


@pytest.mark.skipif(
    not ZEN_API_KEY,
    reason="OPENCODE_ZEN_API_KEY not set — skipping LLM-backed eval",
)
@pytest.mark.parametrize("skill_sha", [AGENT_PATH], indirect=True)
def test_task_decomposition_subtasks(git_sha, skill_sha, phoenix_client, task_decomposition_dataset):
    evaluators = [
        eval_has_multiple_subtasks,
        eval_has_scope_per_subtask,
        eval_has_dependencies,
        eval_no_monolithic_task,
    ]

    experiment = run_experiment(
        dataset=task_decomposition_dataset,
        task=task_fn,
        evaluators=evaluators,
        experiment_name=f"architect@{skill_sha}-repo@{git_sha}",
        experiment_description=(
            "Checks that agent-generated implementation plans decompose work into "
            "3+ subtasks with scope/acceptance criteria, explicit dependencies, "
            "and no monolithic single-task assignment."
        ),
        client=phoenix_client,
        timeout=120,
    )

    assert experiment is not None, "Experiment did not return results"

    avg_score, scores_by_name = _compute_avg_score(experiment)
    assert avg_score >= 0.5, (
        f"Task decomposition score too low: {avg_score:.2f} "
        f"(individual: {scores_by_name}). "
        f"Plans must decompose work into subtasks with scope and dependencies."
    )
