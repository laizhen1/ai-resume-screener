# AI/ML experiment lab

Open **/evaluation** to compare pipelines, inspect errors, review evidence and export reproducible JSON reports. The original repeated-fixture regression UI remains at **/evaluation/regression**.

## Quick start

```sh
npm run compare -- --split development --min-accuracy 0.90 --output reports/development.json
npm run compare -- --split heldout --output reports/heldout-rules.json
npm run compare -- --split heldout --with-model --model qwen3:4b --output reports/heldout-comparison.json
```

The first two commands need no model. The third requires the named model already installed in local Ollama. It does not download models. CLI configuration uses shell environment variables; unlike Next.js, tsx does not automatically load .env.local.

A requested but incomplete model comparison exits 2; invalid arguments or a failed development accuracy gate exit 1. Successful complete runs exit 0. Held-out accuracy cannot be used as a CLI release gate. CI runs the development gate and uploads its report.

For PostgreSQL workspaces run `npm run db:migrate` before using the new dashboard. Migration 002 adds nullable report JSON; existing regression runs remain compatible. The migration runner executes the ordered, idempotent SQL files. Memory-mode reports and feedback disappear when the server restarts.

## What the experiment compares

1. **Rules:** the existing deterministic analyzer.
2. **LLM only:** the existing core Ollama analysis prompt and structured-output schema, before source-quote validation. This is not unconstrained raw text generation.
3. **Hybrid:** the same model response passed through the production composition function, including exact evidence validation and rubric validation. Rules are the fallback.

The two AI variants intentionally share a generation. This is a paired validation ablation: it isolates what verification changes instead of attributing random generation differences to the hybrid pipeline. It does not measure two independently sampled model calls. Optional embeddings and reviewer-summary enrichment are excluded because they do not change the evaluated requirement verdicts.

The evaluator aligns canonical requirement names and the existing skill aliases. It scores the reference requirements; absent extractions become unknown and are also counted in the missing-requirement rate. Extra extracted requirements are retained only indirectly in the model output, not scored by this benchmark. Requirement-discovery precision is therefore outside its scope.

Expected verdicts never enter the model request. The job and resume are the only dataset inputs provided to the analyzer. Model settings use temperature 0 and seed 42; a seed is not a cross-hardware determinism guarantee.

When a model call fails, the raw LLM has **no predictions**, not artificial unknowns. The hybrid uses labeled rule fallbacks. The run stops further model calls after the first failure to avoid repeatedly waiting on a broken provider. Metrics include only completed predictions, with evaluated counts, model counts and fallback counts beside them. Do not compare a partially evaluated pipeline against a complete one or attribute fallback performance to AI.

## Dataset card

| Property | Development | Provisional held-out |
| --- | --- | --- |
| Version | adversarial-context-v2.0 | heldout-evidence-v1.0 |
| Unique documents | 10 | 24 |
| Source | Existing regression fixtures | Separately authored fictional examples |
| Intended use | Prompt/rule iteration and release checks | Frozen comparison after development |
| Labels | Existing fixture labels | Agent-authored; human adjudication pending |
| Requirements per document | Multiple | One |
| Repetitions | One per experiment | One per experiment |

Held-out labels were written before executing the new comparison and were not used to modify the production classification rules or prompt. The 24 documents are balanced across supported, partial, contradicted and unknown. Challenges include delivery, aliases, learning, negation, attribution, ambiguity, formatting, aspirations and embedded instructions.

This is a **small provisional holdout**, not an independently annotated or representative real-world dataset. The task is evidence classification, not suitability or job-performance prediction. No model training, fine-tuning, human annotation study, fairness study or production traffic is claimed.

### Labeling protocol

- Supported: the applicant explicitly describes using or delivering work with the skill.
- Partial: coursework, supervised learning, familiarity or limited exposure.
- Contradicted: explicitly denies the experience.
- Unknown: absent, ambiguous, attributed only to someone else, future intent without current learning, or an instruction masquerading as evidence.

For a stronger next dataset version: recruit two independent annotators; label verdicts and exact evidence spans using this protocol; resolve disagreements with an adjudicator; publish agreement and category counts. Keep document families in the same split. Add consented document extraction examples separately from this text-only classification task.

The SHA-256 hashes the ordered document text, IDs, challenge labels and reference verdicts. Changing any of those creates a new identity. Run JSON includes a snapshot of the examples so reports remain inspectable after dataset changes. Do not silently edit frozen labels.

## Metrics

- Four-class accuracy and confusion matrix (expected rows, predicted columns).
- Macro F1 averaged over all four fixed labels; absent classes contribute zero.
- Supported precision/recall, with null for zero denominators.
- Incorrect-supported rate: incorrect supported verdicts / all supported verdicts. This is 1 minus support precision, not the conventional false-positive rate.
- Invalid-citation rate: non-unknown verdicts missing an exact case-sensitive source quote / all non-unknown verdicts. Quote presence does not establish relevant supporting evidence.
- Abstention and missing-requirement rates, reported separately.
- p50/p95 wall-clock latency using nearest rank over completed cases. Failed call durations remain in individual rows, not successful latency percentiles.
- Per-challenge correct/total counts.
- Approximate 95% Wilson accuracy intervals for one-requirement cases only. These show small-sample uncertainty under a binomial assumption; hand-authored examples are not a random sample of hiring documents. Development examples have correlated requirements, so their interval is omitted.

Rules latency includes deterministic analysis. LLM latency includes local generation and structured parsing. Hybrid latency includes rules + the same generation + validation. Warmup, local hardware and model loading affect results; keep the environment fixed when comparing latency. A mutable Ollama model tag is not an immutable model digest; archive model artifacts and hardware details for publication-grade reproducibility.

## Review loop and leakage prevention

1. Select a pipeline and inspect a failed example.
2. Read the highlighted exact source text and original judgment.
3. Save a proposed verdict plus an explanation.
4. Export review candidates for independent adjudication.

Corrections are append-only audit events with reviewer identity, original prediction, original reference label, run ID and dataset hash. They never alter historical metrics or the frozen labels. Exports are explicitly unapproved development candidates, not training-ready data. If a held-out example informs training, prompts or rules, retire that held-out version and collect a fresh split before claiming unbiased improvements.

## Two-minute portfolio demo

- Run the offline baseline and explain the unique-example count.
- Inspect an attribution or aspiration error and its highlighted source.
- Enable Ollama and compare raw versus verified judgments.
- Explain the confusion matrix, model coverage and one failure category.
- Record a correction; export the immutable report and proposed development data.

Describe what the measurements actually demonstrate. Fill resume bullets with measured dataset sizes and results from exported reports; do not invent improvements or claim human-reviewed labels.
