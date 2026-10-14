# Baseline experiment results

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
npm run compare -- --split development --with-transformers --output reports/development-transformers.json
npm run compare -- --split heldout --with-transformers --output reports/heldout-transformers.json
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

The classification rules and model prompt were not tuned on these errors. Future development using these examples must retire this held-out split and collect fresh comparison data.

## Artifacts

- [Development run](development.json): inputs, predictions, metrics, configuration and timing.
- [Held-out rules run](heldout-rules.json): the complete 24-case report.
- [Dataset card and reproduction commands](../docs/experiments.md): metric definitions, labeling protocol and limitations.

Reports record the Node version, platform, engine version, taxonomy, dataset hash and model configuration. Timings are single local runs and should not be used as capacity estimates.

Ollama was unavailable during verification. These artifacts contain **no measured LLM or hybrid-model quality claims**. A failed-provider run was verified separately: the LLM reports unavailable, hybrid predictions are labeled rule fallbacks, and the CLI signals an incomplete run.

## Resume wording supported by the implementation

- Built an AI evaluation lab comparing deterministic rules, raw LLM judgments and evidence-validated outputs, with confusion matrices, latency metrics and reproducible JSON reports.
- Created a versioned 24-document provisional holdout that exposed four errors missed by existing development fixtures.
- Implemented source-linked evidence inspection and an audited reviewer-feedback workflow that preserves original labels and exports proposed development data.

The holdout labels are provisional and agent-authored. Do not describe them as independently human-annotated. Add model-improvement numbers only after running and validating a real model comparison.
