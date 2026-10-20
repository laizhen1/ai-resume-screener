# Evidence checks and new-example evaluation — v8

Measured 2026-10-20T02:45:54.554Z. Engine 3.2.0; prompt core-analysis-v7-enumerated-categories; category policy evidence-category-v1; source checks evidence-eligibility-v1.

## Outcome

The guided example remains 4/4. In the real rerun, the reused diagnostic changed from v7 20/24 checked judgments to v8 23/24; development changed from 21/24 to 22/24. The new 24-document challenge scored 15/24 before the evidence checks and 23/24 after them. Its rules baseline scored 15/24.

Of the four previous diagnostic errors, 4 now match the labels. New diagnostic regressions relative to v7: 1. Remaining errors on the new challenge: 1; the checks correct 8 judgments and introduce 0 wrong abstentions on that set. Do not call these changes improvements to DeepSeek's weights or unconstrained reasoning.

## Implementation

The model prompt and generation settings are unchanged from v7. A versioned validation layer checks the exact passage selected by the model. It abstains when the passage uses Go/React as ordinary words, attributes the technical work to others without applicant involvement, or contains a recognizable instruction addressed to an AI. It checks each ambiguous mention so genuine technical references can coexist with ordinary words. Attribution checks preserve applicant delivery for another team and explicit cross-sentence applicant involvement. Instruction checks distinguish leading directives from legitimate security work describing an attack string.

The checks never create a supported/partial/contradicted verdict and never receive expected labels. They only downgrade a non-unknown judgment to unknown, record the original verdict and reasons, and leave the original model draft untouched. JSON reports and the evidence inspector retain both the original model response and check decisions. Criterion scoring is not recalibrated by these checks; the model's aggregate scores can still be inconsistent.

These are bounded English pattern checks, not a general semantic parser or a proof of prompt-injection resistance. Obfuscated instructions, multilingual text, complex attribution and unrecognized word senses may escape them; legitimate mixed passages can also cause conservative abstention. Exact source presence still does not prove interpretation correctness.

## Measurement design

1. Saved-output replay: diagnostic-deepseek-v7-checked-v8.json applies the new postprocessing to the original v7 drafts with zero model calls and zero-placeholder latencies. Category-policy output remains 20/24; checked output is 24/24. This isolates the guard's effect on the known failures, not a new live result.
2. Live rerun: one generation per document, shared by the category-policy and checked pipelines, on the complete development, reused diagnostic and new challenge sets. All requested final model pipelines completed with no rule fallback. No quality-based retries or selection of the best response.
3. New examples: 24 separately authored fictional documents, with 8 supported, 8 unknown, 4 partial and 4 contradicted provisional labels. They cover new wording for ambiguity, third-party attribution and instructions, plus positive controls, genuine team involvement, aliases, mixed word senses, real work next to an instruction, learning and denial. The challenge source and validation implementation were hashed before live inference. Neither was changed in response to the challenge results.

The same agent authored the checks and the new examples; this is not independent or blind human annotation. The old sets are reused diagnostics, and even the new challenge does not establish population-level generalization. Its labels need independent review before stronger claims.

## Actual results

| Dataset | Pipeline | Correct | Macro F1 | Supported precision | Model docs | Fallbacks |
|---|---|---:|---:|---:|---:|---:|
| development | Rules baseline | 24/24 | 1.0000 | 100.0% | 0 | 0 |
| development | DeepSeek categories + mapping | 21/24 | 0.8741 | 92.9% | 10 | 0 |
| development | Categories + mapping + evidence checks | 22/24 | 0.9321 | 100.0% | 10 | 0 |
| diagnostic | Rules baseline | 20/24 | 0.8314 | 60.0% | 0 | 0 |
| diagnostic | DeepSeek categories + mapping | 20/24 | 0.8125 | 60.0% | 24 | 0 |
| diagnostic | Categories + mapping + evidence checks | 23/24 | 0.9580 | 85.7% | 24 | 0 |
| new challenge | Rules baseline | 15/24 | 0.6665 | 46.7% | 0 | 0 |
| new challenge | DeepSeek categories + mapping | 15/24 | 0.6243 | 47.1% | 24 | 0 |
| new challenge | Categories + mapping + evidence checks | 23/24 | 0.9496 | 88.9% | 24 | 0 |

Development contains 10 documents and 24 judgments. Both diagnostic and challenge contain 24 documents and 24 judgments. The two model-based rows share calls; model counts must not be added together.

development: checked missing requirement rate 0.0%, invalid/missing citation rate among non-unknown predictions 0.0%; model median 26.9s and P95 36.2s.

diagnostic: checked missing requirement rate 0.0%, invalid/missing citation rate among non-unknown predictions 0.0%; model median 20.8s and P95 26.4s.

new challenge: checked missing requirement rate 0.0%, invalid/missing citation rate among non-unknown predictions 0.0%; model median 22.5s and P95 27.0s.

Timings come from one laptop during development, not a capacity benchmark. Model deepseek-r1:7b, digest 755ced02ce7befdb13b7ca74e1e4d08cddba4986afdb63a480f2c93d3140383f; temperature 0.6, seed 42, reasoning enabled, 8192 context, 4096 output cap, 180-second timeout. A seed is not a cross-runtime determinism guarantee.

## Changes caused by evidence validation

Development:
- adversarial-5 / react: supported → unknown; expected unknown; correction. Checks: ordinary-word.

Reused diagnostic:
- holdout-19 / go: supported → unknown; expected unknown; correction. Checks: ordinary-word.
- holdout-20 / react: supported → unknown; expected unknown; correction. Checks: ordinary-word.
- holdout-22 / kubernetes: supported → unknown; expected unknown; correction. Checks: other-person-work.

New challenge:
- fresh-01 / go: supported → unknown; expected unknown; correction. Checks: ordinary-word.
- fresh-02 / go: supported → unknown; expected unknown; correction. Checks: ordinary-word.
- fresh-03 / react: supported → unknown; expected unknown; correction. Checks: ordinary-word.
- fresh-04 / kubernetes: supported → unknown; expected unknown; correction. Checks: other-person-work.
- fresh-05 / aws: supported → unknown; expected unknown; correction. Checks: other-person-work.
- fresh-06 / terraform: supported → unknown; expected unknown; correction. Checks: other-person-work.
- fresh-07 / pytorch: supported → unknown; expected unknown; correction. Checks: document-instruction.
- fresh-08 / docker: supported → unknown; expected unknown; correction. Checks: document-instruction.

## Remaining checked errors

Development:
- adversarial-1 / typescript: expected supported, observed partial. [evidence-category-v1: applicant_learning_skill] Direct mention of TypeScript as a skill.
  Quote: "TypeScript, React"
- adversarial-1 / react: expected supported, observed partial. [evidence-category-v1: applicant_learning_skill] Direct mention of React as a skill.
  Quote: "TypeScript, React"

Reused diagnostic:
- holdout-24 / terraform: expected unknown, observed supported. [evidence-category-v1: applicant_used_skill]  applicant used skill: the applicant stated they have used Terraform in their current role as a customer support specialist.
  Quote: "I hope to learn Terraform next year. My current work is customer support."

New challenge:
- fresh-17 / docker: expected partial, observed supported. [evidence-category-v1: applicant_used_skill] The applicant explicitly used Docker lessons and container exercises in a supervised setting, demonstrating practical application of the skill.
  Quote: "Completed beginner Docker lessons and container exercises in a supervised classroom lab."

## Verification and retained failures

- 109 TypeScript tests pass across 16 files, including 25 source-check tests and positive controls. The report verifier reconstructs both category-policy predictions and checked predictions/audit decisions.
- Eight Playwright tests pass, including the new challenge selection/export flow. An initial browser run exposed a shared-state race between two evaluation scenarios; those tests now run sequentially. Its failed log is retained. Browser tests use the model-disabled fixture configuration; real model results come from the JSON reports above.
- ESLint and production build pass. The prompt/wire contract did not change, so the previously passing prompt fixture results were not counted as new live-model evidence.
- All historical and current comparison reports are checked for internal consistency. Hashes and complete artifacts accompany this report. The verifier cannot establish label correctness or prove authentic inference execution from JSON alone.
- All v1–v7 reports, including the numeric-schema failures, remain intact. No DeepSeek training/fine-tuning, Python transformer rerun, real recruitment deployment, hiring-efficiency measurement or fairness evaluation was performed.

Previous revisions: [v7 report](deepseek-revision-v7.md), [v4 report](deepseek-revision-v4.md).
