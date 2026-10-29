# DeepSeek v10: investigation, fixes and actual results

V10 live generations with paired v2 source checks (no new calls for the three-set recheck): development **24/24**, challenge **24/24**, reused diagnostic **24/24**; **0 mismatches across 72 judgments**. Guided example **4/4**. New frozen agent-authored controls **16/16**, unavailable 0. These are synthetic regression measurements, not independent or blind evaluation.

## Investigation

See [saved-output investigation](deepseek-v10-investigation.md) and [replay evidence](deepseek-v10-investigation.json). Dataset hashes, model digest and recorded settings match v8/v9; replay changed zero checked judgments. The observed drop comes from changed raw model categories and selected sources, not the skills-score calculation. Exact old request hashes and backend versions were absent, so the lower-level cause of generation variation is not established.

## Implementation

Engine 3.4.1; prompt core-analysis-v9-scoped-passages. Alias-aware candidate excerpts, exact sentence-scoped source passages, and explicit learning/delivery/denial/future distinctions improve grounding. Expected labels never enter inference. The category mapping is unchanged; evidence-boundaries-v2 restores bounded source-line context, preserves instruction scope, caps explicit beginner coursework at partial, and prioritizes explicit present-tense denial. Original verdicts and correction reasons are retained. These are hybrid checks, not a claim that raw DeepSeek output is perfect. New prompt/schema hashes and runtime manifests support investigation. Settings remain temperature 0.6, seed 42, context 8192, output budget 4096.

| Set | Pipeline | Correct | Macro F1 | Model cases | Fallback | Original live p50 / p95 seconds |
|---|---|---|---|---|---|---|
| development | rules | 24/24 | 1.0000 | 0 | 0 | 0.00 / 0.01 |
| development | llm | 22/24 | 0.8594 | 10 | 0 | 27.03 / 36.91 |
| development | hybrid | 24/24 | 1.0000 | 10 | 0 | 27.04 / 36.93 |
| challenge | rules | 15/24 | 0.6665 | 0 | 0 | 0.00 / 0.00 |
| challenge | llm | 17/24 | 0.7382 | 24 | 0 | 25.52 / 40.88 |
| challenge | hybrid | 24/24 | 1.0000 | 24 | 0 | 25.52 / 40.88 |
| diagnostic | rules | 20/24 | 0.8314 | 0 | 0 | 0.00 / 0.00 |
| diagnostic | llm | 19/24 | 0.7705 | 24 | 0 | 23.41 / 29.93 |
| diagnostic | hybrid | 24/24 | 1.0000 | 24 | 0 | 23.41 / 29.93 |

## Iterations and limits

V9 checked scores were 18/24 development, 22/24 challenge and 23/24 diagnostic. The first v10 development pilot scored 22/24; the second sentence-scoped pilot scored 24/24. Both are retained and the final development run above is a separate repeat, not a selected best pilot. Controls were frozen before control inference. Existing evaluation sets are reused and agent-authored; these measurements do not establish generalization or determinism. Early local compilation/browser work may affect latency. Optional transformer pipelines were not run.

Validation: 151 unit tests, 15 browser tests in the final single run, lint and production build passed. Earlier browser failures are retained in local logs; form controls now wait for hydration before accepting edits.

## Remaining final mismatches

None in the 72 final benchmark judgments.

Control mismatches: none.



## Measurement sequence

The prompt-only final live run produced checked scores 24/24 development, 22/24 challenge and 22/24 diagnostic. The first fresh controls scored 15/16. After adding audited v2 source boundaries, the same saved model generations were rechecked (zero new model calls) to 24/24 in all three sets. Fresh DeepSeek calls then scored 16/16 on controls and 4/4 on the guided example. No benchmark fallback occurred. Timing columns retain the original live-run timings and do not benchmark v2 validation latency.

Paired reports: [development](deepseek-v10-development-checked-v2.json), [challenge](deepseek-v10-challenge-checked-v2.json), [diagnostic](deepseek-v10-diagnostic-checked-v2.json). Fresh inference: [controls](deepseek-v10-controls-v2-confirmed.json), [guided example](deepseek-v10-guided-v2-confirmed.json). [Runtime manifest](deepseek-v10-v2-runtime.json).
