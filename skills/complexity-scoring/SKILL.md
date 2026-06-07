---
name: complexity-scoring
description: Assigns a 1-5 complexity score to a task or issue based on its description. Used by the PM and Coordinator agents at issue creation time. The score drives downstream model selection — trivial tasks route to cheap/free models; expert tasks route to frontier models.
triggers:
  - complexity score
  - task scoring
  - model selection
  - complexity
  - issue creation
  - task creation
---

# Complexity Scoring Skill

Use this skill whenever creating or triaging an issue. Assign a `complexity_score` (1–5) based on the task description and store it as issue metadata. This score is the primary input for the model selection engine (APR-205).

## When to Use

- **Always** — every issue created or triaged by an agent must receive a complexity score.
- When the score is missing on an existing issue and you are about to assign it to an agent.
- When re-scoring is needed because the scope of an issue has changed significantly.

## Complexity Scale

| Score | Label | Description | Example Tasks |
|-------|-------|-------------|---------------|
| 1 | Trivial | Formatting, simple lookups, single-value config changes, typo fixes | Fix typo in README, update a config constant, rename a variable |
| 2 | Simple | Clear single-file changes, basic Q&A, straightforward additions | Add a field to a form, rename a function across a file, basic CRUD endpoint |
| 3 | Moderate | Multi-file changes, standard features, well-understood patterns | Add a new API endpoint with tests, implement a UI component, write a migration |
| 4 | Complex | Architecture changes, multi-step reasoning, cross-service coordination | Refactor an auth system, add a caching layer, design a new data model |
| 5 | Expert | Deep research, novel problem solving, system design, complex debugging | Design a new subsystem, investigate a subtle production bug, cross-repo refactor |

## Scoring Process

Evaluate the task description against **three dimensions**. The final score is the highest dimension score (not an average).

### Dimension 1: Scope

How many files, services, or systems are touched?

| Scope | Score |
|-------|-------|
| One file, one location | 1–2 |
| Multiple files, single package | 3 |
| Multiple packages or services | 4 |
| Cross-repo, infrastructure, or third-party integrations | 5 |

### Dimension 2: Reasoning Depth

How much analysis, judgment, or novel thinking is required?

| Reasoning | Score |
|-----------|-------|
| Mechanical — follow a clear template or pattern | 1–2 |
| Standard — apply known patterns with minor adaptation | 3 |
| Design — choose between architectures, handle trade-offs | 4 |
| Research or novel — unknown solution space, requires investigation | 5 |

### Dimension 3: Risk and Reversibility

How hard is it to undo a mistake?

| Risk | Score |
|------|-------|
| Trivially reversible (no side effects) | 1–2 |
| Normal reversibility (git revert + PR) | 3 |
| Data migration, API contract change, or production impact | 4 |
| Irreversible data loss, external dependency, or security-critical | 5 |

## Applying the Score

After scoring, store the result as issue metadata and never leave an issue without a score:

```bash
multica issue metadata set <issue-id> --key complexity_score --value <1-5> --type number
```

### Model Tier Mapping (for downstream use by APR-205)

| Score | Model Tier | Example Models |
|-------|------------|----------------|
| 1 | Free/nano | OpenRouter free models (DeepSeek V4 Flash, Llama 4 Scout) |
| 2 | Budget | Claude Haiku, GPT-4.1 mini, Qwen3 Coder |
| 3 | Mid-tier | Claude Sonnet 4.6, GPT-5.2, Gemini 2.5 Flash |
| 4 | Frontier | Claude Sonnet 4.6 (extended thinking), GPT-5.2 |
| 5 | Premium | Claude Opus 4.6, Gemini 3.1 Pro |

## Examples

| Task Description | Score | Rationale |
|-----------------|-------|-----------|
| "Fix typo in CONTRIBUTING.md" | 1 | Single file, no reasoning required, trivially reversible |
| "Add `email_verified` boolean field to user profile form" | 2 | Single file, clear pattern, low risk |
| "Add a POST /api/v1/webhooks endpoint with signature validation and tests" | 3 | Multi-file (route, handler, tests), standard REST pattern |
| "Refactor the authentication middleware to support multi-tenant JWT claims" | 4 | Multi-service, design decision, breaking change risk |
| "Research and design a distributed rate-limiting solution across edge nodes" | 5 | Novel problem, cross-service, requires deep investigation |

## Scoring Checklist

Before assigning the score:

- [ ] Read the full issue description and acceptance criteria
- [ ] Check if any parent issue or linked issues change the scope
- [ ] Evaluate all three dimensions (Scope, Reasoning, Risk)
- [ ] Assign the highest dimension score as the final score
- [ ] Run `multica issue metadata set <id> --key complexity_score --value <n> --type number`
- [ ] Do NOT leave the issue without a score

## Re-scoring

Re-score an issue when:
- The scope significantly expands or contracts during implementation
- A blocker is resolved in a way that changes the complexity
- The implementer discovers the task is substantially harder or easier than the description suggested

On re-score, overwrite the existing metadata key — do not add a second one.
