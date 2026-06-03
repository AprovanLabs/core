---
name: data-analysis
description: Data exploration, statistical analysis, experiment design, and reporting for the Data Scientist agent. Use to structure analysis work from hypothesis to findings.
triggers:
  - data analysis
  - analysis
  - experiment
  - A/B test
  - metrics
  - statistics
  - visualization
---

# Data Analysis Skill

Use this skill to structure data exploration, statistical analysis, and experiment reporting.

## When to Use

- Exploring a dataset to answer a product question
- Designing or evaluating an A/B experiment
- Auditing data quality or pipeline correctness
- Building or updating product metrics dashboards

## Phase 1 — Define the Question

Before touching any data, write down:

1. **Research question**: What specific question am I answering?
2. **Decision**: What decision will the answer inform?
3. **Success metric**: How will I know the analysis is complete?
4. **Data sources**: Which tables, APIs, or files are relevant?
5. **Time range**: What period does the analysis cover?

Post a workpad comment with these answers before starting analysis.

## Phase 2 — Data Exploration

### Profiling checklist

- Row count and date range
- Null/missing value rates per column
- Cardinality of categorical columns
- Distribution of key numeric columns (min, max, mean, median, p99)
- Outlier detection (values > 3σ from mean)
- Duplicates (by natural key)

### Quality flags

| Issue | Action |
|---|---|
| >5% nulls in key column | Flag in findings; assess impact on conclusions |
| Outliers | Investigate cause; report with and without |
| Duplicates | Deduplicate by natural key; document rule |
| Unexpected cardinality | Verify data pipeline assumptions |

## Phase 3 — Statistical Analysis

### Descriptive statistics (exploratory)

- Use mean ± std for normal distributions
- Use median + IQR for skewed distributions
- Always visualize distributions before summarizing them

### Inferential statistics (A/B tests)

| Test | When |
|---|---|
| t-test (two-sample) | Compare means of two continuous groups |
| Chi-squared | Compare proportions or categorical distributions |
| Mann-Whitney U | Non-parametric alternative to t-test |
| Logistic regression | Model binary outcome with multiple covariates |

**Required reporting for any significance test:**
- Sample sizes (n₁, n₂)
- Observed difference (absolute and relative)
- p-value and confidence interval
- Effect size (Cohen's d, odds ratio, or relative risk)
- Statistical power (if pre-registered)

**Never:**
- Report p-value without effect size
- Cherry-pick the analysis period after seeing results
- Stop an experiment early based on interim results (without pre-specified stopping rules)

### Minimum detectable effect

Before starting an experiment:
1. Define the minimum effect size that would be business-meaningful
2. Use a power calculator (α=0.05, power=0.80) to determine required sample size
3. Estimate how many days are needed to collect that sample

## Phase 4 — Visualization

- One chart per finding; don't pack everything into one figure
- Label axes with units
- Include n on charts with sample data
- Use color to highlight the key comparison, not for decoration
- Accessible color palettes (avoid red/green for colorblind accessibility)

## Phase 5 — Reporting

Post findings as a comment on the issue with this structure:

```markdown
## Analysis: <title>

**Period:** YYYY-MM-DD to YYYY-MM-DD
**Data source:** <table/API/file>
**Sample size:** N = X

### Key Finding

One sentence summary of the most important result.

### Results

<table or bullet list of metrics>

### Statistical Significance

<p-value, CI, effect size>

### Caveats & Limitations

- Limitation 1
- Limitation 2

### Recommendation

Based on these findings: [recommend action or further investigation]

### Open Questions

- Question 1
```

## Phase 6 — Reproducibility

- Commit analysis notebooks to the repo (not just results)
- Document data sources and query logic in the notebook
- Pin library versions in requirements or pyproject.toml
- Include a "run this analysis" instruction at the top of the notebook
