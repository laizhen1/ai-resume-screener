# Portfolio scope and evidence

## Project story

Open Resume Lab is a local LLM evidence-review and evaluation workbench. The engineering problem is that a keyword occurrence can describe delivery, coursework, negation, another person's work or an instruction embedded in a résumé. The goal is to expose those distinctions, preserve source evidence and make the limits of model output inspectable by a human.

The portfolio demonstration follows one path: fictional source → requirement analysis → source-linked verdicts → model/rules comparison → reviewer correction and report export. The headline is explainable evidence review, not automatic hiring or candidate suitability prediction.

## Changes in this portfolio pass

- Added a fixed fictional walkthrough with four evidence states and a route into the evaluation lab.
- Allow cancellation of slow local analysis. Clear obsolete results when inputs change; lock inputs during analysis; clear an old file when switching to a demo or generated profile. File selection is keyboard-focusable.
- Use local DeepSeek-R1-Distill-Qwen-7B through Ollama as the shared generation default, with role overrides, bounded context/output budgets, reasoning controls, readiness checks and a real-inference smoke command.
- Parse final answers only; reject truncated output and incomplete reasoning. Derive Q&A/review/generation JSON constraints from their Zod definitions.
- Distinguish Q&A abstention, malformed output, bad citation and service failure. Verify Q&A quotes against both retrieved passages and the original document.
- Label LLM confidence as uncalibrated. Fix repeated source-line React keys found during browser review.
- Verify archived report hashes, example coverage, labels, citation flags and recalculated metrics without rewriting historical evidence.

## Existing measured evidence

The four original comparison JSON files pass the new internal-consistency verifier. The historical provisional held-out transformer report contains 24 fictional documents and 24 requirement judgments:

| Pipeline | Correct | Accuracy | Macro F1 |
|---|---:|---:|---:|
| Rules | 20/24 | 83.33% | 0.8314 |
| Dense NLI | 12/24 | 50.00% | 0.4861 |
| Reranked NLI | 12/24 | 50.00% | 0.4861 |
| Rules + transformers | 21/24 | 87.50% | 0.8773 |

These are archived observations, not newly rerun transformer experiments. Labels remain agent-authored and provisional. The hybrid difference is one judgment; it does not establish real-world improvement. Pure NLI underperformed rules. Citation presence did not prevent four incorrect rule-supported judgments.

New DeepSeek live runs must be reported separately with their actual coverage, model digest, generation settings, fallback counts and errors. A four-requirement walkthrough is an integration check, not an independent test set. See [DeepSeek reproduction instructions](deepseek.md).

## What can and cannot go on a résumé

Supported claims include implementation of multi-format ingestion, exact source evidence, four-way evidence classification, local LLM generation, hybrid retrieval and NLI integration, model comparison, immutable reviewer feedback, and report verification. Test counts should come from the latest successful run.

Training code supports BERT/DistilBERT NER and a four-way requirement–evidence classifier. Earlier runs used tiny randomly initialized BERT smoke models, with zero entity F1 and 25% classifier accuracy. Do not describe those as successful résumé-domain fine-tuning or claim accuracy gains from training. This pass does not train DeepSeek.

Do not claim real recruitment deployment, reduced hiring time, fairness certification, independently human-annotated labels or production throughput. None has been established by this repository's evidence.

## Next substantive ML milestone

Collect consented or fictional independently authored document families; have two reviewers label evidence spans and verdicts and adjudicate disagreement. Freeze a family-disjoint test set before tuning. Compare rules, DeepSeek, pretrained NLI and any trained classifier using identical coverage. Choose confidence/abstention settings only on validation data. Report macro F1, false-supported predictions, abstention, invalid citations and latency with errors retained. Train a domain classifier only if that measured error analysis justifies it.

This is the missing evidence needed to make a stronger fine-tuning STAR claim. Adding a named model alone does not supply that evidence.

## Completed DeepSeek diagnostics

See [the measured integration report](../reports/deepseek-integration.md) and [Chinese STAR wording](STAR-resume-zh.txt). Those initial runs used an exact-name protocol that missed 17/24 names. The shared identity fix removes those mismatches in replay. See [the subsequent revision results](../reports/deepseek-revision.md) for corrected baselines, live runs and retained failures; do not attribute the alignment correction to model learning.


## Current v8 portfolio wording

The approved [Chinese resume](resume-project-zh.txt) and [STAR/interview preparation](STAR-resume-zh.txt) distinguish dictionary-based requirement extraction, model evidence-category selection, fixed four-class mapping and source eligibility checks. The [progress record](progress.md) lists current measurements, tests and remaining work.

On the 24-example synthetic challenge, rules and the pre-check category-policy output both score 15/24; the checked output scores 23/24 (95.8%), with four-class macro F1 0.9496. The same agent authored the checks and provisional labels, so this is not an independent blind test. Development rules score 24/24 versus 22/24 for the checked model path. Natural-language evidence selection and explanation are product capabilities; broad generalization or superiority over rules has not been established.

Describe iteration as evaluation-page error categories, per-case error attribution and versioned v1–v8 revisions with failures retained. There is no separate Bad Case module. Claim support for fully local inference, subject to local model/OCR/storage configuration, rather than unconditional data confinement.
