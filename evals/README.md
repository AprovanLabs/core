# Evals

Evaluation suites for Aprovan agents and skills, powered by [Arize Phoenix](https://github.com/Arize-ai/phoenix).

## Setup

```bash
cd evals
pip install -e .
```

## Running Evals

Start the Phoenix server on-demand before running evals:

```bash
cd evals
phoenix serve --working-dir .phoenix-data
```

In a separate terminal, run the evals:

```bash
cd evals
python -m pytest
```

Run evals for a specific category:

```bash
python -m pytest skills/     # skill evals only
python -m pytest agents/     # agent evals only
```

When done, stop the Phoenix server with `Ctrl+C`.

## Viewing Results

While the Phoenix server is running, open the UI at [http://localhost:6006](http://localhost:6006) to browse experiment results, compare scores across runs, and review dataset versions.

## Architecture

- **Datasets** (`agents/datasets/`, `skills/datasets/`) are Git-tracked JSON files that define eval inputs and expected outputs.
- **Phoenix data** (`.phoenix-data/`) is local SQLite storage, gitignored — each machine has its own results database.
- **conftest.py** provides shared pytest fixtures: `git_sha` (repo HEAD), `skill_sha` (specific skill file blob), and `phoenix_client` (Phoenix API client).
- **Experiment names** encode the skill/agent SHA and repo SHA for traceability (e.g. `code-review@abc12345-repo@def67890`).

## Eval Derivation Pipeline

Closed issues are automatically analyzed by the Eval Checker agent to derive new eval scenarios from user review feedback. See `eval_check_prompt.md` for the prompt template used.

## Adding New Evals

1. Create a dataset JSON file in the appropriate `datasets/` directory
2. Write a pytest test that uses `run_experiment()` from `arize-phoenix-client`
3. Tag experiment names with `git_sha` and `skill_sha` fixtures for traceability
