# Baseline experiment results

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
