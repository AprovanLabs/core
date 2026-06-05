import json
import os
import re

import pytest
from openai import OpenAI
from phoenix.client.experiments import run_experiment

SKILL_PATH = "skills/api-design"

ZEN_API_KEY = os.environ.get("OPENCODE_ZEN_API_KEY", "")
ZEN_BASE_URL = os.environ.get(
    "OPENCODE_ZEN_BASE_URL", "https://opencode.ai/zen/v1"
)
ZEN_MODEL = os.environ.get("OPENCODE_ZEN_MODEL", "opencode/big-pickle")

DATASET_PATH = os.path.join(
    os.path.dirname(__file__), "datasets", "api_client_error_handling.json"
)

SYSTEM_PROMPT = """\
You are a Python developer. Write production-quality Python code based on the user's request.
Return ONLY the Python code — no markdown fences, no explanations, no imports beyond what is needed.
"""

TASK_PROMPT_TEMPLATE = """\
{task}

Context about the API: {context}
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


def eval_has_timeout(output, expected):
    code = output or ""
    timeout_pattern = re.compile(r"timeout\s*=", re.IGNORECASE)
    has_timeout = bool(timeout_pattern.search(code))
    return (int(has_timeout), "has_timeout" if has_timeout else "missing_timeout")


def eval_has_try_except(output, expected):
    code = output or ""
    has_try = "try" in code and "except" in code
    return (int(has_try), "has_try_except" if has_try else "missing_try_except")


def eval_catches_connection_error(output, expected):
    code = output or ""
    catches = bool(
        re.search(r"except\s+.*ConnectionError", code, re.IGNORECASE)
    )
    return (
        int(catches),
        "catches_connection_error" if catches else "missing_connection_error_catch",
    )


def eval_catches_timeout_error(output, expected):
    code = output or ""
    catches = bool(
        re.search(
            r"except\s+.*(?:Timeout|ReadTimeout|ConnectTimeout)",
            code,
            re.IGNORECASE,
        )
    )
    return (
        int(catches),
        "catches_timeout_error" if catches else "missing_timeout_error_catch",
    )


def eval_catches_json_decode_error(output, expected):
    code = output or ""
    catches = bool(
        re.search(
            r"except\s+.*(?:JSONDecodeError|json\.decoder\.JSONDecodeError|ValueError)",
            code,
            re.IGNORECASE,
        )
    )
    return (
        int(catches),
        "catches_json_decode_error" if catches else "missing_json_decode_error_catch",
    )


def eval_graceful_degradation(output, expected):
    code = output or ""
    returns_none = bool(re.search(r"return\s+None", code))
    returns_empty = bool(re.search(r"return\s+(\[\]|\{\}|\"\")", code))
    raises_typed = bool(re.search(r"raise\s+[A-Z]\w+Error", code))
    passes_graceful = returns_none or returns_empty or raises_typed
    return (
        int(passes_graceful),
        "has_graceful_degradation" if passes_graceful else "missing_graceful_degradation",
    )


def eval_retry_or_informative_errors(output, expected):
    code = output or ""
    has_retry = bool(
        re.search(r"retry|retries|max_retries|backoff", code, re.IGNORECASE)
    )
    has_informative_error = bool(
        re.search(r"(raise|logging|logger\.|log\.).*error", code, re.IGNORECASE)
    ) or bool(
        re.search(r"error_msg|error_message|err_msg", code, re.IGNORECASE)
    )
    passes = has_retry or has_informative_error
    return (
        int(passes),
        "has_retry_or_informative_errors" if passes else "missing_retry_and_informative_errors",
    )


def eval_uses_shared_handler(output, expected):
    code = output or ""
    handler_names = re.findall(
        r"def\s+(_\w*(?:request|fetch|get|call|http|do_request|send|make_request|safe_request|safe_get|execute)\w*)\s*\(",
        code,
        re.IGNORECASE,
    )
    if not handler_names:
        return (0, "missing_shared_handler")
    handler_name = handler_names[0]
    call_pattern = re.compile(
        rf"(?:self\.)?{re.escape(handler_name)}\s*\(", re.IGNORECASE
    )
    call_count = len(call_pattern.findall(code))
    if call_count >= 2:
        return (1, "uses_shared_handler")
    direct_calls = len(re.findall(r"requests\.(?:get|post|put|delete|patch|request)\s*\(", code))
    if direct_calls == 1 and call_count >= 1:
        return (1, "uses_shared_handler")
    return (0, "handler_defined_but_not_reused")


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
def api_client_dataset(phoenix_client):
    examples = _load_dataset_examples()
    return phoenix_client.datasets.create_dataset(
        name="api-client-error-handling",
        inputs=[ex["input"] for ex in examples],
        outputs=[ex["expected"] for ex in examples],
        dataset_description=(
            "Evaluates whether agent-generated API client code includes "
            "timeouts, error handling, graceful degradation for external HTTP calls, "
            "and uses a shared/generic HTTP handler function instead of duplicating "
            "request logic. Derived from APR-92."
        ),
    )


@pytest.mark.skipif(
    not ZEN_API_KEY,
    reason="OPENCODE_ZEN_API_KEY not set — skipping LLM-backed eval",
)
@pytest.mark.parametrize("skill_sha", [SKILL_PATH], indirect=True)
def test_api_client_error_handling(git_sha, skill_sha, phoenix_client, api_client_dataset):
    evaluators = [
        eval_has_timeout,
        eval_has_try_except,
        eval_catches_connection_error,
        eval_catches_timeout_error,
        eval_catches_json_decode_error,
        eval_graceful_degradation,
        eval_retry_or_informative_errors,
        eval_uses_shared_handler,
    ]

    experiment = run_experiment(
        dataset=api_client_dataset,
        task=task_fn,
        evaluators=evaluators,
        experiment_name=f"api-design@{skill_sha}-repo@{git_sha}",
        experiment_description=(
            "Checks that generated API client code includes timeouts, "
            "error handling (ConnectionError, Timeout, JSONDecodeError), "
            "graceful degradation, retry logic or informative errors, "
            "and uses a shared/generic HTTP handler function rather than "
            "duplicating request logic across methods."
        ),
        client=phoenix_client,
        timeout=120,
    )

    assert experiment is not None, "Experiment did not return results"

    avg_score, scores_by_name = _compute_avg_score(experiment)
    assert avg_score >= 0.5, (
        f"API client error handling score too low: {avg_score:.2f} "
        f"(individual: {scores_by_name}). "
        f"Generated code must include timeouts, error handling, "
        f"and a shared HTTP handler function."
    )
