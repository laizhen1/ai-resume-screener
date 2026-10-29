# Portfolio scope and evidence

## Latest v13 evaluation

Engine **3.7.1** fresh DeepSeek rerun: inspected examples **32/32**, new synthetic controls **16/16**, guided **4/4**. **4/4** prior mismatches now match their labels. New-control four-class macro F1 **1.0000**; raw model **12/16**. New controls were frozen before inference but use familiar failure mechanisms and agent-authored labels; they are not independent or family-disjoint evaluation. [Full results](../reports/deepseek-v13-results.md).


## Historical first-use evaluation v2

On 16 first-use synthetic documents (32 judgments), unchanged engine **3.6.0** scored **28/32 (87.5%)**, four-class macro F1 **0.8576** after checks; raw DeepSeek scored **27/32**. There were **4 checked mismatches**. Documents and provisional agent labels were frozen before this single-pass run. These are new examples of partly familiar mechanisms, not independently annotated or family-disjoint evaluation. [Full results and errors](../reports/novel-generalization-v2.md).


## Historical v12 evaluation

Engine **3.6.0** fresh rerun: transfer **32/32**, controls **16/16**, temporal confirmation **4/4**, guided example **4/4**. **6/6** previously remaining case/skill errors now match their labels. These are reused, inspected synthetic regression sets; raw/checked results, any new errors and separate zero-call replays are recorded in the [v12 report](../reports/deepseek-v12-results.md). No independent generalization claim is made.


## Historical v11 evaluation

Engine **3.5.3** fixes **11/11 original mismatches**. Inspected set A: **48/48** on fresh v11 inference, unchanged in the final-check replay (previously 37/48). New transfer set B: **27/32** on first use; its check-induced temporal regression was repaired, yielding **28/32** in a clearly labeled saved-output replay. Fresh post-fix controls C: **15/16**, four-class macro F1 **0.9365**; temporal confirmations **3/4**, guided example **4/4**. These are agent-authored synthetic measurements, not independent or family-disjoint evaluation. [Full results, remaining errors and execution distinctions](../reports/deepseek-v11-results.md).


## Historical first new-example evaluation

On 24 newly authored fictional documents (48 judgments, 12 per class), the unchanged engine 3.4.1 checked pipeline scored **37/48 (77.1%)**, four-class macro F1 **0.7632**. Raw DeepSeek scored **35/48**. This was a fresh, single-pass inference run with labels and engine hashes frozen beforehand; it was not replay or independent human annotation. [Full results and errors](../reports/novel-generalization-v1.md).

## Historical v10 regression results

V10 live generations with paired v2 source checks (no new calls for the three-set recheck): development **24/24**, challenge **24/24**, reused diagnostic **24/24**; **0 mismatches across 72 judgments**. Guided example **4/4**. New frozen agent-authored controls **16/16**, unavailable 0. These are synthetic regression measurements, not independent or blind evaluation. [Full results](../reports/deepseek-v10-results.md).

## Historical v9 integration — 2026-10-28

Fresh v9 rerun (2026-10-28): checked DeepSeek 22/24 challenge (91.7%, four-class macro F1 0.8889), 18/24 development, 23/24 reused diagnostic. Challenge rules 15/24; raw model 16/24. Total checked mismatches: 9/72. All are reused, agent-labeled synthetic sets, not independent tests. See [v9 report](../reports/deepseek-v9-integration-2026-10-28.md) for paired outputs, latency, hashes and failures. Application checks: 138 unit tests, 15 browser tests, lint and production build passed.

## Project story

Open Resume Lab is a local LLM evidence-review and evaluation workbench. The engineering problem is that a keyword occurrence can describe delivery, coursework, negation, another person's work or an instruction embedded in a résumé. The goal is to expose those distinctions, preserve source evidence and make the limits of model output inspectable by a human.

The portfolio demonstration follows one path: fictional source → requirement analysis → source-linked verdicts → model/rules comparison → reviewer correction and report export. The headline is explainable evidence review, not automatic hiring or candidate suitability prediction.

## Guided Studio interface — 2026-10-26

The analyzer now uses a three-step workflow with input-preserving navigation, drag-and-drop documents, an evidence-first result view and a shared responsive shell. Workspace and evaluation features keep their existing API contracts. A custom SVG document/evidence-check mark replaces initials. Validation: 109 TypeScript tests, 12 browser tests, ESLint and a production build. These checks validate application behavior; the historical model results below were not rerun.

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

See [the measured integration report](../reports/deepseek-integration.md). Those initial runs used an exact-name protocol that missed 17/24 names. The shared identity fix removes those mismatches in replay. See [the subsequent revision results](../reports/deepseek-revision.md) for corrected baselines, live runs and retained failures; do not attribute the alignment correction to model learning.


## Current v8 implementation and evidence

The current pipeline combines dictionary-based requirement extraction, model evidence-category selection, fixed four-class mapping and source eligibility checks. The [progress record](progress.md) lists current measurements, tests and remaining work.

In the archived v8 evaluation, on the 24-example synthetic challenge, rules and the pre-check category-policy output both score 15/24; the checked output scores 23/24 (95.8%), with four-class macro F1 0.9496. The same agent authored the checks and provisional labels, so this is not an independent blind test. Development rules score 24/24 versus 22/24 for the checked model path. Natural-language evidence selection and explanation are product capabilities; broad generalization or superiority over rules has not been established.

Describe iteration as evaluation-page error categories, per-case error attribution and versioned v1–v8 revisions with failures retained. There is no separate Bad Case module. Claim support for fully local inference, subject to local model/OCR/storage configuration, rather than unconditional data confinement.


The 2026-10-28 live guided example remains 4/4. Across all three v9 sets, 58 documents completed model inference with zero fallback; there are 9 mismatches across 72 judgments. The challenge and development scores are lower than archived v8; the cause of this variation has not been established.
