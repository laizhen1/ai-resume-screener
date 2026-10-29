# DeepSeek v13 — array scoping and non-claim boundaries

Recorded 2026-10-29. Engine **3.7.1** fresh DeepSeek rerun: inspected examples **32/32**, new synthetic controls **16/16**, guided **4/4**. **4/4** prior mismatches now match their labels. New-control four-class macro F1 **1.0000**; raw model **12/16**. New controls were frozen before inference but use familiar failure mechanisms and agent-authored labels; they are not independent or family-disjoint evaluation.

## Changes and tests

Prompt core-analysis-v13-array-passages splits exact JSON string-value tokens for root arrays as well as objects. The boundary checker also separates parsed array strings by skill, preventing a different skill's learning statement from being borrowed. This is value/skill scoping, not a general owner-aware JSON interpreter. Checks evidence-boundaries-v8 recognize additional English vacancy/placeholder wording and Chinese advert/future-study wording. Chinese delivery cues protect genuine software projects about adverts or reading plans. Unknown verdicts are not promoted.

214 unit tests, 15 browser tests, lint and production build passed. New tests cover exact array citations, malformed/escaped inputs, the four failures and positive delivery/learning/denial controls. The initial 3.7.0 attempt was interrupted after 11 documents when Angular was omitted and scored as unknown through missing-key alignment. Its checkpoint is preserved in [the interruption record](v13-interrupted-attempt.json). Engine 3.7.1 adds Angular to the canonical dictionary (taxonomy 2026.10.1) and tests its required evidence slot. The new controls had not run before this correction. The final run retains unchanged labels and adds 25 calls to the 11 interrupted calls. No functional application code was changed after the final evaluation freeze. After the runs, trailing blank lines in three files were removed; the separate [post-format manifest](v13-post-format-runtime.json) records those whitespace-only hash changes.

## Fresh inference

25 fresh document calls (16 inspected + 8 new controls + 1 guided), with one generation shared by raw and checked pipelines per document. References never supplied to inference. No label changes, result overwrites or model downloads.

| Set | Pipeline | Correct | Accuracy | Macro F1 (four classes) | Fallback | Missing requirement rate | p50 ms | p95 ms |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| inspected | rules | 19/32 | 59.4% | 0.5270 | 0 | 0.0% | 2 | 6 |
| inspected | llm | 27/32 | 84.4% | 0.8171 | 0 | 0.0% | 35027 | 54623 |
| inspected | hybrid | 32/32 | 100.0% | 1.0000 | 0 | 0.0% | 35030 | 54625 |
| new | rules | 8/16 | 50.0% | 0.4405 | 0 | 0.0% | 2 | 11 |
| new | llm | 12/16 | 75.0% | 0.7143 | 0 | 0.0% | 33671 | 42083 |
| new | hybrid | 16/16 | 100.0% | 1.0000 | 0 | 0.0% | 33674 | 42086 |
| guided | rules | 4/4 | 100.0% | 1.0000 | 0 | 0.0% | 14 | 14 |
| guided | llm | 4/4 | 100.0% | 1.0000 | 0 | 0.0% | 39777 | 39777 |
| guided | hybrid | 4/4 | 100.0% | 1.0000 | 0 | 0.0% | 39807 | 39807 |

## Prior error outcomes

| Case / skill | Expected | Before | Fresh v13 |
|---|---|---|---|
| novel2-03 / python | unknown | contradicted | unknown |
| novel2-09 / angular | unknown | partial | unknown |
| novel2-10 / aws | unknown | partial | unknown |
| novel2-11 / tailwind | unknown | supported | unknown |

## Remaining checked errors

### inspected

None against the frozen labels.

### new

None against the frozen labels.

### guided

None against the frozen labels.

## Paired effects and saved-output regressions

- inspected: 5 raw errors repaired; 0 correct raw judgments changed to incorrect.
- new: 4 raw errors repaired; 0 correct raw judgments changed to incorrect.
- guided: 0 raw errors repaired; 0 correct raw judgments changed to incorrect.

Saved-output replays use zero new model calls and retain historical timings; they do not evaluate new passage selection:

- inspected: 32/32.
- transfer: 32/32.
- controls: 16/16.
- temporal: 4/4.
- original: 48/48.
- development: 24/24.
- challenge: 24/24.
- diagnostic: 24/24.

## Scope and evidence

Adding Angular also changes the rules baseline from 20/32 to 19/32: its formerly missing Angular prediction was counted as unknown, while the explicit rule prediction is now incorrect. Missing-requirement rates are therefore reported alongside accuracy.

The original [first-use probe](novel-generalization-v2.md) stays **28/32**; the rerun is inspected regression evidence. New controls are first-use wording/scenarios targeted at known mechanisms, including root arrays, Chinese text, placeholders and legitimate delivery. No exact historical document duplicates were found, but independent family separation is not claimed. Labels are provisional and agent-authored, with rationale frozen before inference. This small selected sample does not establish broad generalization, fairness or hiring validity. PDF/DOCX/OCR and optional transformer retrieval were not evaluated. Preserve any new failures for a later version; never replace first-use measurements.

Artifacts: [inspected inputs](v13-inspected-final-frozen.json), [inspected results](v13-inspected-final-results.json); [new inputs](v13-new-final-frozen.json), [new results](v13-new-final-results.json); [guided inputs](v13-guided-final-frozen.json), [guided results](v13-guided-final-results.json); [errors and target outcomes](v13-errors.json); [verification](v13-verification.json); runtime [before](v13-final-runtime-before.json) and [after](v13-final-runtime-after.json). Source/model hashes remained stable throughout inference (before/after manifests); post-run formatting hashes are recorded separately. All historical evaluations remain intact. Nothing committed or pushed; personal Chinese notes remain ignored.
