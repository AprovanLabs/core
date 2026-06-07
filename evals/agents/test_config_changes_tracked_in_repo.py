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
    os.path.dirname(__file__), "datasets", "config_changes_tracked_in_repo.json"
)

SYSTEM_PROMPT = """\
You are a coding agent working in a Multica workspace. You have access to both the \
multica CLI (for interacting with the Multica platform) and a checked-out git repo \
(the 'core' repo) that tracks all workspace configuration: skills, agent definitions, \
autopilots, and other config files.

The repo is the source of truth for all configuration. The Multica platform is the \
deployment target. You must always edit config files in the repo, commit, push, and \
submit a PR. Never apply config changes directly to the Multica platform.

Describe your complete approach to the task below, including which files you would edit, \
what commands you would run, and how you would submit the changes.
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


def eval_edits_repo_files(output, expected):
    text = output or ""
    repo_edit_patterns = [
        r"\b(?:edit|modify|update|create|write|add)\s+(?:the\s+)?(?:file|files)\b",
        r"\bskills/[^\s]+\.md\b",
        r"\bagents/[^\s]+\.md\b",
        r"\bSKILL\.md\b",
        r"\b\.md\b.*\bin\s+(?:the\s+)?(?:repo|repository|core)\b",
        r"\b(?:repo|repository|core)/(?:skills|agents)/",
        r"\bvim\b|\bnano\b|\bcode\s+",
        r"\b(?:open|create|write)\s+\S+\.md\b",
    ]
    found = any(re.search(p, text, re.IGNORECASE) for p in repo_edit_patterns)
    return (
        int(found),
        "edits_repo_files" if found else "missing_repo_file_edits",
    )


def eval_mentions_pr_or_push(output, expected):
    text = output or ""
    pr_push_patterns = [
        r"\bpull\s+request\b",
        r"\bPR\b",
        r"\bgit\s+(?:add|commit|push)\b",
        r"\bgit\s+checkout\s+-b\b",
        r"\bsubmit\s+(?:a\s+)?(?:PR|pull\s+request)\b",
        r"\bpush.*(?:to|branch)\b",
        r"\bopen\s+(?:a\s+)?(?:PR|pull\s+request)\b",
        r"\bbranch\b.*\bpush\b",
    ]
    found = any(re.search(p, text, re.IGNORECASE) for p in pr_push_patterns)
    return (
        int(found),
        "mentions_pr_or_push" if found else "missing_pr_or_push",
    )


def eval_no_direct_platform_edits(output, expected):
    text = output or ""
    direct_edit_patterns = [
        r"\bmultica\s+(?:skill|agent|autopilot)\s+(?:create|update|edit)\b",
        r"\bapply\s+(?:changes|config|the\s+skill|the\s+agent)\s+(?:directly\s+)?(?:to|on)\s+(?:the\s+)?(?:platform|workspace|multica)\b",
        r"\buse\s+(?:the\s+)?multica\s+(?:CLI|api)\s+to\s+(?:create|update|modify|edit)\b",
        r"\bdirectly\s+(?:to|on|via)\s+(?:the\s+)?(?:platform|workspace|multica)\b",
        r"\b(?:apply|push|deploy)\s+(?:changes\s+)?(?:directly|straight)\b",
    ]
    negation_patterns = [
        r"\b(?:do\s+not|don'?t|should\s+not|must\s+not|never)\s+.*\b(?:apply|edit|modify|update|create)\s+.*\b(?:directly|platform|multica)\b",
        r"\b(?:not|no)\s+(?:via|through|using)\s+(?:the\s+)?(?:platform|multica)\b",
        r"\b(?:repo|repository|git)\s+(?:is|should\s+be)\s+(?:the\s+)?source\s+of\s+truth\b",
    ]
    has_direct = any(re.search(p, text, re.IGNORECASE) for p in direct_edit_patterns)
    has_negation = any(
        re.search(p, text, re.IGNORECASE) for p in negation_patterns
    )
    if has_direct and not has_negation:
        return (0, "direct_platform_edits_detected")
    return (1, "no_direct_platform_edits")


def eval_recognizes_repo_as_source_of_truth(output, expected):
    text = output or ""
    sot_patterns = [
        r"\bsource\s+of\s+truth\b",
        r"\brepo\s+(?:is|as|should\s+be)\s+(?:the\s+)?(?:source\s+of\s+truth|canonical|authoritative)\b",
        r"\b(?:track|version.?control)\s+.*\b(?:in|via|through)\s+(?:the\s+)?(?:repo|repository|git)\b",
        r"\b(?:repo|repository|git)\s+(?:first|before|then|->)\b",
        r"\bplatform\s+(?:is|as)\s+(?:the\s+)?(?:deployment\s+)?target\b",
        r"\bdeploy\s+(?:from|via)\s+(?:the\s+)?(?:repo|repository|git)\b",
        r"\b(?:all|every)\s+(?:config|configuration)\s+(?:changes?|updates?)\s+(?:must|should)\s+(?:go|be)\s+(?:through|in|via)\s+(?:the\s+)?(?:repo|repository|git)\b",
    ]
    found = any(re.search(p, text, re.IGNORECASE) for p in sot_patterns)
    return (
        int(found),
        "recognizes_repo_as_source_of_truth" if found else "missing_source_of_truth_recognition",
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
def config_changes_tracked_in_repo_dataset(phoenix_client):
    examples = _load_dataset_examples()
    return phoenix_client.datasets.create_dataset(
        name="config-changes-tracked-in-repo",
        inputs=[ex["input"] for ex in examples],
        outputs=[ex["expected"] for ex in examples],
        dataset_description=(
            "Evaluates whether agents track Multica workspace configuration changes "
            "(skills, agent definitions, autopilots) in version-controlled repo files "
            "rather than applying them directly to the platform. Guards against the "
            "failure mode where an agent edits config via the multica CLI and skips "
            "the repo/PR workflow. Derived from APR-188, referencing APR-185."
        ),
    )


@pytest.mark.skipif(
    not ZEN_API_KEY,
    reason="OPENCODE_ZEN_API_KEY not set — skipping LLM-backed eval",
)
@pytest.mark.parametrize("skill_sha", [AGENT_PATH], indirect=True)
def test_config_changes_tracked_in_repo(git_sha, skill_sha, phoenix_client, config_changes_tracked_in_repo_dataset):
    evaluators = [
        eval_edits_repo_files,
        eval_mentions_pr_or_push,
        eval_no_direct_platform_edits,
        eval_recognizes_repo_as_source_of_truth,
    ]

    experiment = run_experiment(
        dataset=config_changes_tracked_in_repo_dataset,
        task=task_fn,
        evaluators=evaluators,
        experiment_name=f"engineer@{skill_sha}-repo@{git_sha}",
        experiment_description=(
            "Checks that agent responses demonstrate editing config files in the repo, "
            "committing and pushing via git, opening a PR, never applying changes "
            "directly to the Multica platform, and recognizing the repo as the source "
            "of truth with the platform as the deployment target."
        ),
        client=phoenix_client,
        timeout=120,
    )

    assert experiment is not None, "Experiment did not return results"

    avg_score, scores_by_name = _compute_avg_score(experiment)
    assert avg_score >= 0.5, (
        f"Config changes tracked in repo score too low: {avg_score:.2f} "
        f"(individual: {scores_by_name}). "
        f"Agent must track config changes in repo files and submit via PR."
    )
