# DeepSeek v11 — confirmed boundaries, new examples and a repaired regression

Recorded 2026-10-29. Current engine **3.5.3**, prompt **core-analysis-v11-scope-multilingual**, checks **evidence-boundaries-v6**. Model: DeepSeek-R1-Distill-Qwen-7B via Ollama (deepseek-r1:7b). Installed digest, generation settings and source fingerprints: [final runtime](v11-runtime-v6.json).

## Outcome

All **11/11 original mismatches** are fixed. The inspected 24-document set achieved **48/48** in fresh engine-3.5.2 inference (previously 37/48); replaying those same generations through final 3.5.3 checks preserves **48/48**. Raw DeepSeek scored **36/48**. Do not present this reused set as independent generalization evidence.

The new 16-document transfer set scored **27/32 (84.4%) on its first use**. It exposed a check-induced temporal regression: a correct later Java delivery quote was replaced by an old denial elsewhere in the source line. The complete first-pass artifact is preserved. After fixing that context-expansion defect, a **zero-new-call paired replay** scores **28/32 (87.5%)**, macro F1 **0.8730**. That corrected score is not untouched evaluation.

Fresh post-fix controls C contain eight new fictional documents / 16 judgments, four per class, and score **15/16 (93.8%)**, macro F1 **0.9365**. Two inspected temporal confirmations score **3/4**; the guided example scores **4/4**. These small agent-authored controls test the repair; they do not replace the original first-use result or establish broad generalization.

## Fresh inference results

| Set and execution | Pipeline | Correct | Accuracy | Four-class macro F1 | Model documents | Fallback documents |
|---|---|---:|---:|---:|---:|---:|
| Inspected A / fresh model calls / engine 3.5.2 | rules | 26/48 | 54.2% | 0.4760 | 0 | 0 |
| Inspected A / fresh model calls / engine 3.5.2 | llm | 36/48 | 75.0% | 0.7147 | 24 | 0 |
| Inspected A / fresh model calls / engine 3.5.2 | hybrid | 48/48 | 100.0% | 1.0000 | 24 | 0 |
| New transfer B / first-use / engine 3.5.2 | rules | 17/32 | 53.1% | 0.4604 | 0 | 0 |
| New transfer B / first-use / engine 3.5.2 | llm | 23/32 | 71.9% | 0.7051 | 16 | 0 |
| New transfer B / first-use / engine 3.5.2 | hybrid | 27/32 | 84.4% | 0.8461 | 16 | 0 |
| New controls C / fresh / engine 3.5.3 | rules | 8/16 | 50.0% | 0.4338 | 0 | 0 |
| New controls C / fresh / engine 3.5.3 | llm | 11/16 | 68.8% | 0.6472 | 8 | 0 |
| New controls C / fresh / engine 3.5.3 | hybrid | 15/16 | 93.8% | 0.9365 | 8 | 0 |
| Temporal confirmation / inspected / fresh 3.5.3 | rules | 2/4 | 50.0% | 0.1667 | 0 | 0 |
| Temporal confirmation / inspected / fresh 3.5.3 | llm | 3/4 | 75.0% | 0.3667 | 2 | 0 |
| Temporal confirmation / inspected / fresh 3.5.3 | hybrid | 3/4 | 75.0% | 0.3667 | 2 | 0 |
| Guided example / fresh 3.5.3 | rules | 4/4 | 100.0% | 1.0000 | 0 | 0 |
| Guided example / fresh 3.5.3 | llm | 4/4 | 100.0% | 1.0000 | 1 | 0 |
| Guided example / fresh 3.5.3 | hybrid | 4/4 | 100.0% | 1.0000 | 1 | 0 |

The temporal confirmation subset contains only supported/contradicted reference labels. Its four-class macro F1 includes zero contributions for absent classes and should not be compared directly with the balanced A/B/C sets.

## Paired final-check results (no new model calls)

| Saved generation set | Final checked correct | Macro F1 | Raw errors repaired | Correct raw judgments harmed |
|---|---:|---:|---:|---:|
| Inspected A | 48/48 | 1.0000 | 12 | 0 |
| New transfer B, now inspected | 28/32 | 0.8730 | 5 | 0 |

Before the repair, B's v5 checks had paired effects {"repaired":5,"harmed":1}; the v6 comparison above uses exactly the same model outputs. New controls C paired effects: {"repaired":4,"harmed":0}. Historical v10 development/challenge/diagnostic generations were also rechecked under v6; their recorded counts are in [verification](v11-verification.json). This is regression replay, not fresh inference with the current prompt on those older sets.

Observed raw-model latency (p50/p95 seconds): A 35.09/48.04, B 31.32/47.29, C 32.21/41.85. These are local observations, not controlled performance comparisons.

## Changes and evaluation discipline

The user confirmed five boundary labels after seeing predictions; [decision record](v11-label-review.json). This is policy adjudication, not blind annotation. All original reference labels remain unchanged.

- Clarified missing claims versus explicit current denial, beginner workshops versus delivery, scoped contractor nonparticipation, structured skill fields and temporal retractions in the prompt.
- Added audited source boundaries and exact bounded source-line restoration. Unknown model judgments are never promoted. A missing citation still causes abstention.
- Reject forged review payloads and document identifiers as applicant experience. Non-claim checks apply across supported/partial/contradicted categories, while delivery and actual-denial controls protect valid evidence.
- The final v6 repair preserves a valid supported quote instead of importing an older denial through unnecessary context expansion. It still permits surrounding context to resolve an ambiguous/contradicted fragment or an explicit learning boundary.

Intermediate live runs are retained: engine 3.5.0 [40/48](v11-inspected-results.json), engine 3.5.1 [47/48](v11-inspected-final-results.json). The queued 3.5.1 new-set phase was intentionally deferred before model calls; [deferral record](v11-new-run-deferral.txt). B was first evaluated only after freezing engine 3.5.2. No code or labels changed during any frozen run. After B exposed the introduced regression, that first-use evaluation was closed and preserved; v6 was developed with B now treated as inspected material. C was newly frozen before its inference. No tuning followed C's results.

All examples are fictional and agent-authored. B uses new wording and skill combinations within known failure mechanisms (eight judgments per class); C is targeted repair coverage. Neither is independent, blind to failure mechanisms, family-disjoint or representative hiring data. Text-level tests do not evaluate upload/OCR, hiring validity, fairness, explanation quality or extra inferred requirements. Judgments within a document are correlated. Confidence is uncalibrated. Do not merge these sets into one headline generalization score.

## Remaining inspected A errors under final checks

None against the frozen labels.

## Remaining B errors under final checks

- **transfer-b07/tailwind** — expected **unknown**, observed **contradicted**. Selected source: A blank form includes "Tailwind: add your example"; it is not completed.. [evidence-category-v1: applicant_explicitly_denies_skill] The applicant did not provide evidence of using Tailwind.
- **transfer-b08/python** — expected **unknown**, observed **contradicted**. Selected source: 虚构申请人 B08。附录引用职位广告：“使用 Python 清洗数据。”这段广告不是我的经历，工作记录中没有提供相关证据。我从未使用过 TypeScript，也没有 TypeScript 项目经验。. [evidence-category-v1: applicant_explicitly_denies_skill] Applicant explicitly denies experience with Python.
- **transfer-b09/azure** — expected **contradicted**, observed **unknown**. Selected source: (no citation). [evidence-category-v1: future_intention_only] Future intention only
- **transfer-b11/go** — expected **unknown**, observed **contradicted**. Selected source: Here Go is an ordinary English word, not a software skill.. [evidence-category-v1: applicant_explicitly_denies_skill] Applicant explicitly denies experience with Go.

## Remaining fresh C errors

- **control-c01/azure** — expected **unknown**, observed **contradicted**. Selected source: Azure is only a future reading topic;. [evidence-category-v1: applicant_explicitly_denies_skill] Explicit denial of experience with this skill.

## Remaining fresh temporal-confirmation errors

- **transfer-b03/java** — expected **supported**, observed **contradicted**. Selected source: My 2020 biography said I had never used Java.. [evidence-category-v1: applicant_explicitly_denies_skill]  applicant_explicitly_denies_skill: 2020 statement about not using Java.

A replay can preserve an already-correct later quote while a fresh model call still selects an obsolete denial. The context repair prevents the former check-induced regression; it is not a complete temporal reasoner.

## Validation and artifacts

184 unit tests, 15 browser tests, lint and production build (including TypeScript) passed for the final candidate. [Saved-report consistency verification](v11-verification.json) checks hashes, counts, source citations, decoded model outputs where versions match, and final checked predictions. It does not establish independent label quality.

- A: [frozen input](v11-inspected-verified-frozen.json), [fresh outputs](v11-inspected-verified-results.json), [final-check replay](v11-inspected-v6-replay.json)
- B: [original frozen data](v11-new-transfer-frozen.json), [evaluated freeze](v11-new-verified-frozen.json), [first-use outputs](v11-new-verified-results.json), [final-check replay](v11-new-v6-replay.json)
- C: [frozen controls](v11-new-controls-v6-frozen.json), [fresh outputs](v11-new-controls-v6-results.json)
- [Temporal confirmation](v11-temporal-confirmation-results.json), [guided example](v11-guided-v6-results.json), [machine-readable errors](v11-errors.json)

Historical failures and raw generations remain available. Personal Chinese career notes remain ignored and local-only. Nothing was committed or pushed.
