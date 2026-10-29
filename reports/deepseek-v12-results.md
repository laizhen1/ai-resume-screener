# DeepSeek v12 — scoped passages, non-claims and temporal evidence

Recorded 2026-10-29. Engine **3.6.0**; prompt **core-analysis-v12-structured-passages**; checks **evidence-boundaries-v7**. DeepSeek-R1-Distill-Qwen-7B via Ollama (deepseek-r1:7b), installed model reused. [Runtime before](v12-runtime-before.json), [after](v12-runtime-after.json).

## Fresh rerun results

| Inspected set | Pipeline | Correct | Accuracy | Four-class macro F1 | Model documents | Fallback documents |
|---|---|---:|---:|---:|---:|---:|
| transfer | rules | 17/32 | 53.1% | 0.4604 | 0 | 0 |
| transfer | llm | 26/32 | 81.3% | 0.8049 | 16 | 0 |
| transfer | hybrid | 32/32 | 100.0% | 1.0000 | 16 | 0 |
| controls | rules | 8/16 | 50.0% | 0.4338 | 0 | 0 |
| controls | llm | 13/16 | 81.3% | 0.8128 | 8 | 0 |
| controls | hybrid | 16/16 | 100.0% | 1.0000 | 8 | 0 |
| temporal | rules | 2/4 | 50.0% | 0.1667 | 0 | 0 |
| temporal | llm | 3/4 | 75.0% | 0.3667 | 2 | 0 |
| temporal | hybrid | 4/4 | 100.0% | 0.5000 | 2 | 0 |
| guided | rules | 4/4 | 100.0% | 1.0000 | 0 | 0 |
| guided | llm | 4/4 | 100.0% | 1.0000 | 1 | 0 |
| guided | hybrid | 4/4 | 100.0% | 1.0000 | 1 | 0 |

These are **27 fresh model calls**: 16 transfer documents, 8 controls, 2 temporal confirmations and 1 guided example. Raw and checked pipelines share one generation per document. Sources were frozen before and checked after each run; labels are unchanged. All these examples were inspected before v12, so this is regression validation, not new independent generalization evidence. The temporal subset has only supported/contradicted references; its four-class macro F1 includes zero contributions from absent classes and is not directly comparable with balanced sets.

## Previously remaining errors

6/6 previously remaining case/skill judgments now match their reference labels in fresh inference.

| Set/case | Skill | Expected | Previous checked result | Fresh v12 checked result |
|---|---|---|---|---|
| transfer/transfer-b07 | tailwind | unknown | contradicted | unknown |
| transfer/transfer-b08 | python | unknown | contradicted | unknown |
| transfer/transfer-b09 | azure | contradicted | unknown | contradicted |
| transfer/transfer-b11 | go | unknown | contradicted | unknown |
| controls/control-c01 | azure | unknown | contradicted | unknown |
| temporal/transfer-b03 | java | supported | contradicted | supported |

## Implementation

- Split string values in valid JSON objects into separate exact source passages, so a future plan for one skill and a denial for another no longer share a single selectable passage. No invented citation or forced positive judgment is introduced; missing model citations still abstain. This is string-value extraction, not a general JSON schema/path interpreter.
- Split Chinese sentence punctuation while retaining exact substrings, improving per-skill candidate scope and separating quoted adverts from applicant claims.
- Extend bounded non-claim recognition to blank forms, ordinary-language explanations and future reading/study topics. Delivery controls protect legitimate work involving forms or reading products.
- Add a dated biography/profile retraction check requiring an explicit retraction and later dated delivery, alongside the existing explicit-old-statement handling. Controls cover reversed dates, missing retraction and unknown judgments, which are not promoted.

## Effects and historical checks

- transfer: 6 wrong raw judgments repaired; 0 correct raw judgments harmed.
- controls: 3 wrong raw judgments repaired; 0 correct raw judgments harmed.
- temporal: 1 wrong raw judgments repaired; 0 correct raw judgments harmed.
- guided: 0 wrong raw judgments repaired; 0 correct raw judgments harmed.

Saved v11/v10 generations were separately replayed with new checks. These rows use **zero new model calls**, retain their original generation timings, and are not fresh reruns:

| Saved generation set | Final checked correct | Four-class macro F1 |
|---|---:|---:|
| original | 48/48 | 1.0000 |
| transfer | 31/32 | 0.9686 |
| controls | 16/16 | 1.0000 |
| temporal | 4/4 | 0.5000 |
| development | 24/24 | 1.0000 |
| challenge | 24/24 | 1.0000 |
| diagnostic | 24/24 | 1.0000 |

The pre-rerun transfer replay cannot repair the old Azure output's missing citation. Fresh inference evaluates the passage-selection change; do not equate source-check replay with that result. Historic B first-use **27/32**, v11 corrected replay **28/32**, C **15/16** and temporal **3/4** remain unchanged in [v11](deepseek-v11-results.md). Source segmentation and prompt changes accompany the check changes; this run does not isolate their separate causal contributions. A fixed seed is not a guarantee of identical local model output.

## Remaining errors in this run

### transfer

None against the frozen labels.

### controls

None against the frozen labels.

### temporal

None against the frozen labels.

### guided

None against the frozen labels.

## Validation and scope

200 unit tests, 15 browser tests, lint and production build including TypeScript passed. [Report verification](v12-verification.json) checks recorded metrics, hashes, exact citations and version-compatible decoded/checked outputs; it does not establish independent label quality. No training or model download occurred. The optional transformer pipelines and real document-upload/OCR quality were not evaluated by these model runs.

Labels are provisional, agent-authored; five earlier boundary decisions were confirmed by the user after viewing predictions, not in blind review. The sets reuse known failure mechanisms and now serve as development/regression material. Do not present perfect scores, if any, as broad hiring accuracy or generalization. Future broad claims need separately sourced and independently reviewed examples. Extra inferred requirements, explanation quality, fairness and hiring outcomes are outside the fixed-key judgment metric.

Artifacts: [transfer frozen input](v12-transfer-final-frozen.json), [transfer live results](v12-transfer-results.json); [controls frozen input](v12-controls-final-frozen.json), [controls live results](v12-controls-results.json); [temporal frozen input](v12-temporal-final-frozen.json), [temporal live results](v12-temporal-results.json); [guided frozen input](v12-guided-final-frozen.json), [guided live results](v12-guided-results.json). [All errors and target comparisons](v12-errors.json). All historic outputs are preserved. Personal Chinese notes remain local-only; nothing was committed or pushed.
