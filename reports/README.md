# Measured experiment results

## Latest v13 evaluation

Engine **3.7.1** fresh DeepSeek rerun: inspected examples **32/32**, new synthetic controls **16/16**, guided **4/4**. **4/4** prior mismatches now match their labels. New-control four-class macro F1 **1.0000**; raw model **12/16**. New controls were frozen before inference but use familiar failure mechanisms and agent-authored labels; they are not independent or family-disjoint evaluation. [Full results](deepseek-v13-results.md).


## Historical first-use evaluation v2

On 16 first-use synthetic documents (32 judgments), unchanged engine **3.6.0** scored **28/32 (87.5%)**, four-class macro F1 **0.8576** after checks; raw DeepSeek scored **27/32**. There were **4 checked mismatches**. Documents and provisional agent labels were frozen before this single-pass run. These are new examples of partly familiar mechanisms, not independently annotated or family-disjoint evaluation. [Full results and errors](novel-generalization-v2.md).


## Historical v12 evaluation

Engine **3.6.0** fresh rerun: transfer **32/32**, controls **16/16**, temporal confirmation **4/4**, guided example **4/4**. **6/6** previously remaining case/skill errors now match their labels. These are reused, inspected synthetic regression sets; raw/checked results, any new errors and separate zero-call replays are recorded in the [v12 report](deepseek-v12-results.md). No independent generalization claim is made.


## Historical v11 evaluation

Engine **3.5.3** fixes **11/11 original mismatches**. Inspected set A: **48/48** on fresh v11 inference, unchanged in the final-check replay (previously 37/48). New transfer set B: **27/32** on first use; its check-induced temporal regression was repaired, yielding **28/32** in a clearly labeled saved-output replay. Fresh post-fix controls C: **15/16**, four-class macro F1 **0.9365**; temporal confirmations **3/4**, guided example **4/4**. These are agent-authored synthetic measurements, not independent or family-disjoint evaluation. [Full results, remaining errors and execution distinctions](deepseek-v11-results.md).


## Historical first new-example evaluation

On 24 newly authored fictional documents (48 judgments, 12 per class), the unchanged engine 3.4.1 checked pipeline scored **37/48 (77.1%)**, four-class macro F1 **0.7632**. Raw DeepSeek scored **35/48**. This was a fresh, single-pass inference run with labels and engine hashes frozen beforehand; it was not replay or independent human annotation. [Full results and errors](novel-generalization-v1.md).

## Historical v10 regression results

V10 live generations with paired v2 source checks (no new calls for the three-set recheck): development **24/24**, challenge **24/24**, reused diagnostic **24/24**; **0 mismatches across 72 judgments**. Guided example **4/4**. New frozen agent-authored controls **16/16**, unavailable 0. These are synthetic regression measurements, not independent or blind evaluation. [Full results](deepseek-v10-results.md).

## Historical v9 integration — 2026-10-28

Fresh v9 rerun (2026-10-28): checked DeepSeek 22/24 challenge (91.7%, four-class macro F1 0.8889), 18/24 development, 23/24 reused diagnostic. Challenge rules 15/24; raw model 16/24. Total checked mismatches: 9/72. All are reused, agent-labeled synthetic sets, not independent tests. See [v9 report](deepseek-v9-integration-2026-10-28.md) for paired outputs, latency, hashes and failures. Application checks: 138 unit tests, 15 browser tests, lint and production build passed.

## Current DeepSeek v8 results

| Dataset | Rules | DeepSeek categories + policy | With evidence checks | Checked four-class macro F1 |
| --- | ---: | ---: | ---: | ---: |
| Development | 24/24 | 21/24 | 22/24 | 0.9321 |
| Reused diagnostic | 20/24 | 20/24 | 23/24 | 0.9580 |
| New synthetic challenge | 15/24 | 15/24 | 23/24 | 0.9496 |

Development has 10 documents and 24 requirement judgments; each other set has 24 documents and one judgment per document. The two DeepSeek variants share one generation per document. The challenge rules and labels were authored by the same agent: it is synthetic, provisionally labeled, not independently annotated or blind. Its 23/24 (95.8%) and four-class macro F1 0.9496 are application-pipeline measurements, not proof of generalization or hiring validity.

The public guided example passes 4/4. All final v8 DeepSeek calls completed without rule fallback. Optional transformer comparisons were not rerun in v8; their historical measurements below remain separate.

Raw evidence: [development](development-deepseek-v8.json), [reused diagnostic](diagnostic-deepseek-v8.json), [new challenge](challenge-deepseek-v8.json), [guided example](deepseek-demo-v8.json), and [saved-output replay without new inference](diagnostic-deepseek-v7-checked-v8.json). The [v8 revision report](deepseek-revision.md) records per-case changes and residual errors. The [progress record](../docs/progress.md) tracks current status; v1–v8 failed runs and prior reports are retained.

## Historical baseline and transformer measurements

For training, Promptfoo, and retrieval implementation checks, see [AI foundations verification](ai-foundations-verification.md). Those smoke results are separate from the model-quality experiments below.

## Transformer integrations

The application now also compares `dense-nli`, `reranked-nli` and `rules-transformer`. The original baseline artifacts below remain unchanged. Unit and orchestration tests use controlled responses; the separate [development transformer run](development-transformers.json) uses the actual downloaded checkpoints on CPU.

| Development pipeline | Correct / 24 requirements | Macro F1 | Abstention |
| --- | ---: | ---: | ---: |
| Rules | 24/24 | 1.000 | 12.5% |
| Dense retrieval + DeBERTa | 11/24 | 0.324 | 50.0% |
| Reranked retrieval + DeBERTa | 10/24 | 0.302 | 54.2% |
| Rules + transformers | 24/24 | 1.000 | 12.5% |

The off-the-shelf NLI variants underperformed the existing rules on these ten development documents. Reranking did not improve this result. The hybrid matched the rules through its explicit preservation policy; this is not evidence of a model-driven accuracy gain. Transformer evidence remains advisory. These initial settings were not tuned against the held-out set. Domain-specific annotation and calibration are future work.

The subsequent [provisional held-out transformer run](heldout-transformers.json), using the same settings, recorded:

| Held-out pipeline | Correct / 24 requirements | Macro F1 | Support precision |
| --- | ---: | ---: | ---: |
| Rules | 20/24 | 0.831 | 60.0% |
| Dense retrieval + DeBERTa | 12/24 | 0.486 | 66.7% |
| Reranked retrieval + DeBERTa | 12/24 | 0.486 | 66.7% |
| Rules + transformers | 21/24 | 0.877 | 66.7% |

The hybrid got one additional judgment correct in this small provisional set. That observation is not a statistically established or real-world improvement claim. Pure NLI still underperformed rules, and independent human label review remains pending. No model, threshold, prompt or decision-policy changes were made between these two runs. Ollama was not requested in either run.

Start the [local model service](../services/model-service/README.md), then capture a fresh run:

```sh
npm run compare -- --split development --with-transformers --output reports/development-transformers-repeat.json
npm run compare -- --split heldout --with-transformers --output reports/diagnostic-transformers-repeat.json
```

Reports record transformer model IDs/revisions, package versions, retrieval settings, source spans and NLI probabilities for each completed case. An unavailable service produces zero evaluated transformer predictions and CLI exit code 2. See [methodology and timing boundaries](../docs/transformer-experiments.md) before comparing latency or claiming improvements.

## Recorded rules baseline

These measurements evaluate the existing rules engine with the new harness. They are not an improvement claim or a measure of hiring validity.

| Metric | Development | Provisional held-out |
| --- | ---: | ---: |
| Unique fictional documents | 10 | 24 |
| Labeled requirements | 24 | 24 |
| Correct verdicts | 24/24 | 20/24 |
| Four-class accuracy | 100% | 83.3% |
| Macro F1 | 1.000 | 0.831 |
| Supported precision | 100% | 60% |
| Supported recall | 100% | 100% |
| Invalid citation rate | 0% | 0% |

Held-out accuracy has an approximate 95% Wilson interval of **64.1% to 93.3%**. These hand-authored examples are not a random population sample; the interval only illustrates small-sample uncertainty.

## Errors uncovered

All four errors were incorrectly supported verdicts:

- **holdout-11:** SQL evening-course learning was labeled supported instead of partial.
- **holdout-22:** a team's Kubernetes work was attributed to an applicant with different responsibilities.
- **holdout-23:** an instruction embedded in the resume was mistaken for PyTorch experience.
- **holdout-24:** an intention to learn Terraform next year was mistaken for current experience.

Every incorrect verdict had an exact source quote. Citation presence alone does not establish that the judgment is correct.

The original baseline classification rules and prompt were not tuned on these errors. Subsequent DeepSeek revisions used observed error categories, so this split is now a previously inspected diagnostic. See [the complete revision results](deepseek-revision.md). Fresh independently reviewed comparison data is needed for generalization claims.

## Artifacts

- [Development run](development.json): inputs, predictions, metrics, configuration and timing.
- [Held-out rules run](heldout-rules.json): the complete 24-case report.
- [Dataset card and reproduction commands](../docs/experiments.md): metric definitions, labeling protocol and limitations.

Reports record the Node version, platform, engine version, taxonomy, dataset hash and model configuration. Timings are single local runs and should not be used as capacity estimates.

Ollama was unavailable during the original baseline verification. Those original artifacts contain **no measured LLM or hybrid-model quality claims**. New measured DeepSeek runs, including incomplete and poor results, are documented separately in [DeepSeek integration and diagnostics](deepseek-integration.md). A failed-provider run was verified separately: the LLM reports unavailable, hybrid predictions are labeled rule fallbacks, and the CLI signals an incomplete run.

## Resume wording supported by the implementation

- Built an AI evaluation lab comparing deterministic rules, model categories mapped through a fixed policy and evidence-checked outputs, with confusion matrices, latency metrics and reproducible JSON reports.
- Created a versioned 24-document diagnostic set, originally a provisional holdout, that exposed four errors missed by development fixtures; later revisions retained its inputs and reported its reused status.
- Implemented source-linked evidence inspection and an audited reviewer-feedback workflow that preserves original labels and exports proposed development data.

The holdout labels are provisional and agent-authored. Do not describe them as independently human-annotated. Initial DeepSeek results had a since-fixed name-alignment limitation. The current category-plus-policy revision and its retained failures are in [the latest report](deepseek-revision.md); its reused diagnostic is not an independent test.
