# AI/ML experiment lab

Open **/evaluation** to compare pipelines, inspect errors, review evidence and export reproducible JSON reports. The original repeated-fixture regression UI remains at **/evaluation/regression**.

## Quick start

```sh
npm run compare -- --split development --min-accuracy 0.90 --output reports/development-rules-repeat.json
npm run compare -- --split heldout --output reports/diagnostic-rules-repeat.json
node --env-file=.env.local --import tsx scripts/compare.ts --split heldout --with-model --model deepseek-r1:7b --output reports/diagnostic-deepseek-v8-repeat.json
```

The first two commands need no model. The third requires the model already installed in Ollama and explicitly loads `.env.local`. Plain `tsx` commands otherwise use exported environment variables. Choose a fresh output filename for each run; preserve previous successes and failures.

A requested but incomplete model comparison exits 2; invalid arguments or a failed development accuracy gate exit 1. Successful complete runs exit 0. Held-out accuracy cannot be used as a CLI release gate. CI runs the development gate and uploads its report.

For PostgreSQL workspaces run `npm run db:migrate` before using the new dashboard. Migration 002 adds nullable report JSON; existing regression runs remain compatible. The migration runner executes the ordered, idempotent SQL files. Memory-mode reports and feedback disappear when the server restarts.

## What the experiment compares

1. **Rules:** the existing deterministic analyzer.
2. **LLM categories + policy (`llm`):** the model selects a passage and one of seven semantic evidence categories; the fixed policy maps it to one of four verdicts before the production evidence checks. This is neither unconstrained generation nor a direct-model four-class prediction.
3. **Evidence-checked LLM (`hybrid`):** the same generation passed through production composition, including identity, quote, rubric and v8 eligibility checks. These checks only abstain. A failed generation or composition may produce a separately labeled rules fallback.

The two AI variants intentionally share a generation. This is a paired validation ablation: it isolates what verification changes instead of attributing random generation differences to the hybrid pipeline. It does not measure two independently sampled model calls. Optional embeddings and reviewer-summary enrichment are excluded because they do not change the evaluated requirement verdicts.

The evaluator aligns canonical requirement names and the existing skill aliases. It scores the reference requirements; absent extractions become unknown and are also counted in the missing-requirement rate. Extra extracted requirements are retained only indirectly in the model output, not scored by this benchmark. Requirement-discovery precision is therefore outside its scope.

Expected verdicts never enter the model request. The job and resume are the only dataset inputs provided to the analyzer. Original archived runs used temperature 0 and seed 42. New runs use the interactive model default (DeepSeek: 0.6) unless `--temperature` is specified; the seed remains 42 and actual generation settings are saved. A seed is not a cross-hardware determinism guarantee. Raw parsed model drafts are retained for extraction/alignment diagnosis.

When a model call fails, the raw LLM has **no predictions**, not artificial unknowns. The hybrid uses labeled rule fallbacks. The run stops further model calls after the first failure to avoid repeatedly waiting on a broken provider. Metrics include only completed predictions, with evaluated counts, model counts and fallback counts beside them. Do not compare a partially evaluated pipeline against a complete one or attribute fallback performance to AI.

## Dataset card

| Property | Development | Reused diagnostic (`heldout` CLI name) | New synthetic challenge |
| --- | --- | --- | --- |
| Version | adversarial-context-v2.0 | heldout-evidence-v1.0 | evidence-challenge-v1.0 |
| Unique documents | 10 | 24 | 24 |
| Requirement judgments | 24 | 24 | 24 |
| Source | Existing regression fixtures | Previously inspected fictional examples | New agent-authored fictional examples |
| Current use | Iteration and regression checks | Diagnostic; no longer an untouched holdout | Frozen new-wording check, not an independent blind test |
| Labels | Existing fixture labels | Provisional agent labels | Provisional labels from the same agent that authored the checks |
| Class counts | See report snapshot | 6 per class | 8 supported, 8 unknown, 4 partial, 4 contradicted |

The legacy heldout examples and labels remain unchanged, but their errors informed later revisions. The new challenge and relevant implementation were frozen before live inference and were not changed in response to its results. Neither set establishes population-level generalization. The task is evidence classification, not suitability or job-performance prediction. See [current results and remaining errors](progress.md).

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
- Enable Ollama and compare category-policy versus evidence-checked judgments.
- Explain the confusion matrix, model coverage and one failure category.
- Record a correction; export the immutable report and proposed development data.

Describe what the measurements actually demonstrate. Fill resume bullets with measured dataset sizes and results from exported reports; do not invent improvements or claim human-reviewed labels.

## Additional transformer comparisons

The comparison lab now supports `dense-nli`, `reranked-nli` and `rules-transformer` alongside the original three pipelines. Enable **Include transformers + reranking** in the UI or pass `--with-transformers` to the CLI. The new variants share frozen source documents with the baseline and receive no expected labels. Failed service requests are unavailable, not abstentions or rule predictions. Historical reports remain readable.

See [transformer experiments](transformer-experiments.md) for the exact verdict mapping, evidence-budget ablation, model provenance and distinct latency boundaries, and [model-service README](../services/model-service/README.md) for setup.

## DeepSeek revision diagnostics

The legacy heldout split is now retired as an untouched test: observed errors informed the DeepSeek revisions. Its example content and labels are unchanged. Current reports identify it as a previously inspected diagnostic. See [the complete revision report](../reports/deepseek-revision.md), including corrected v1 replay, unsuccessful intermediate revisions and the final live run. Known requirement identities and selected source text are supplied by the application in the final contract; the model selects passages and evidence categories. From v5 onward, llm rows measure category-to-verdict policy output, and hybrid rows add source validation. The raw category response is retained. V7 uses numeric enums after range-only schemas still admitted invalid units; reports include evidencePolicyVersion and outputSemantics. The evaluation page discloses these distinctions.


## V8 source-evidence checks and new challenge

Engine 3.2.0 retains the v7 prompt and evidence-category-v1 mapping. The evidence-eligibility-v1 checks apply only to the hybrid/displayed result, abstaining on recognizable ordinary-word senses, external ownership without applicant participation, and document instructions. The llm row preserves the original category-policy output. Check decisions retain the original verdict and reasons; the verifier reconstructs checked outputs as well as raw category-policy outputs. Aggregate scores are not recalibrated.

The separately frozen challenge contains 24 new agent-authored examples with provisional labels. It is available in the evaluation page and CLI:

```sh
node --env-file=.env.local --import tsx scripts/compare.ts --split challenge --with-model --output reports/challenge-deepseek-v8-repeat.json
npm run verify:reports -- reports/challenge-deepseek-v8-repeat.json
```

Do not describe this challenge as independently human-annotated or an unbiased population estimate. The same agent designed the checks and challenge; source/data hashes were frozen before model calls, and no tuning followed its live results. See [actual v8 measurements](../reports/deepseek-revision.md).
