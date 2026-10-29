# New-example generalization probe — frozen v1

On 24 newly authored fictional documents (48 judgments, 12 per class), the unchanged engine 3.4.1 checked pipeline scored **37/48 (77.1%)**, four-class macro F1 **0.7632**. Raw DeepSeek scored **35/48**. This was a fresh, single-pass inference run with labels and engine hashes frozen beforehand; it was not replay or independent human annotation.

## Protocol

Documents and label rationales were written before inference. All production-source hashes were checked before and after the run; no model/prompt/check changes or label edits were allowed. Each document has two correlated judgments, so no independence-based confidence interval is claimed. The set is balanced by construction rather than representative of hiring data. Reference verdicts and label rationales are never supplied to the model; only the job and résumé are passed.

Coverage: 6 English scenarios, 6 contextual scenarios, 4 Chinese/bilingual documents, 2 extracted-text formats, 2 longer contexts and 4 transfer scenarios. This does not test file upload, OCR, PDF/DOCX extraction, fairness or real-world hiring outcomes. No exact duplicate exists among 75 checked prior fixtures; maximum word-trigram Jaccard overlap is 9.3%. Lexical novelty is not proof of independent scenario families.

## Measured results

| Pipeline | Correct / evaluated | Accuracy | Four-class macro F1 | Model documents | Fallback documents | p50 / p95 seconds |
|---|---|---|---|---|---|---|
| rules | 26/48 | 54.2% | 0.4760 | 0 | 0 | 0.00 / 0.01 |
| llm | 35/48 | 72.9% | 0.7105 | 24 | 0 | 25.88 / 33.46 |
| hybrid | 37/48 | 77.1% | 0.7632 | 24 | 0 | 25.89 / 33.46 |

Paired check effects: 2 wrong raw judgments corrected; 0 correct raw judgments harmed; 11 wrong in both. Raw and checked rows share the same fresh model generation.

| Slice | Checked correct |
|---|---|
| english | 10/12 |
| context | 9/12 |
| multilingual | 7/8 |
| format | 3/4 |
| long-context | 2/4 |
| transfer | 6/8 |

| Reference class | Checked correct |
|---|---|
| supported | 11/12 |
| partial | 9/12 |
| contradicted | 12/12 |
| unknown | 5/12 |

## Interpretation

The perfect 72/72 regression recheck did not fully transfer to these new examples. The new-set result is the appropriate current generalization probe; the old 72/72 remains a regression measurement, not a general accuracy claim. Nine of the 11 checked mismatches were false contradicted labels. Unknown evidence was the weakest class (5/12 correct): the model often interpreted quoted adverts, placeholders, future plans and non-claims as explicit denials. The other two errors overclaimed workshop experience and accepted a review-looking payload. Some scope/denial label boundaries warrant independent human adjudication.

The two successful checks were other-person-work protection on novel-05/Docker and the newer coursework boundary on novel-23/AWS. The old prompt was not rerun on this new set, so this experiment does not causally isolate the prompt changes from earlier versions. The same agent authored the labels with knowledge of previous failure mechanisms. Human blinded review and independently sourced families remain necessary before broader claims. No tuning was performed after observing this run.

## Every remaining checked mismatch

- **novel-01 / redis**: reference partial, raw contradicted, checked contradicted. Reference rationale: Only current beginner class exercises; absence of a delivery claim is not an explicit denial of all experience. Model/check reason: [evidence-category-v1: applicant_explicitly_denies_skill] Applicant explicitly denied having used Redis for professional work.
- **novel-06 / go**: reference unknown, raw contradicted, checked contradicted. Reference rationale: Explicit ordinary-language slogan. Model/check reason: [evidence-category-v1: applicant_explicitly_denies_skill] One article headline was "Go beyond the catalogue"; the word Go was a slogan, not a programming claim.
- **novel-09 / typescript**: reference supported, raw contradicted, checked contradicted. Reference rationale: Explicit later delivery supersedes a dated denial. Model/check reason: [evidence-category-v1: applicant_explicitly_denies_skill] The applicant explicitly states they have never used TypeScript.
- **novel-11 / github actions**: reference partial, raw supported, checked supported. Reference rationale: Guided workshop only, despite performing an action. Model/check reason: [evidence-category-v1: applicant_used_skill] applicant used GitHub Actions in a supervised club workshop by modifying a workflow, demonstrating practical experience.
- **novel-12 / tailwind**: reference unknown, raw contradicted, checked contradicted. Reference rationale: Unfilled template placeholder, not a skill claim. Model/check reason: [evidence-category-v1: applicant_explicitly_denies_skill] The candidate mentions an unfinished template with Tailwind, but there's no explicit use demonstrated.
- **novel-14 / python**: reference unknown, raw contradicted, checked contradicted. Reference rationale: Python appears only in a quoted role advert, not evidence of applicant experience. Model/check reason: [evidence-category-v1: applicant_explicitly_denies_skill] Applicant explicitly denies experience.
- **novel-18 / aws**: reference unknown, raw contradicted, checked contradicted. Reference rationale: Future possible study only. Model/check reason: [evidence-category-v1: applicant_explicitly_denies_skill] Applicant explicitly denies having used AWS.
- **novel-19 / kubernetes**: reference partial, raw contradicted, checked contradicted. Reference rationale: Own introductory sandbox course, distinct from supplier production work. Model/check reason: [evidence-category-v1: applicant_explicitly_denies_skill] Applicant explicitly denied Kubernetes experience through introductory exercises.
- **novel-20 / terraform**: reference unknown, raw contradicted, checked contradicted. Reference rationale: Contractor-only work; administrative handoff does not establish applicant technical involvement. Model/check reason: [evidence-category-v1: applicant_explicitly_denies_skill] Applicant explicitly denies having used Terraform.
- **novel-23 / azure**: reference unknown, raw contradicted, checked contradicted. Reference rationale: Future wish list, no current learning; absence of a claim is not an explicit never-used denial. Model/check reason: [evidence-category-v1: applicant_explicitly_denies_skill] The applicant has not started studying Azure and make no Azure experience claim.
- **novel-24 / rag**: reference unknown, raw supported, checked supported. Reference rationale: Review-looking payload is explicitly untrusted example data, not experience. Model/check reason: [evidence-category-v1: applicant_used_skill] Applicant used RAG to get a supported result.

## Artifacts and validation

[Frozen examples, rationale, novelty audit and source hashes](novel-generalization-v1-frozen.json); [full raw and checked results](novel-generalization-v1-results.json); [all mismatches](novel-generalization-v1-errors.json); [runtime before](novel-generalization-v1-runtime-before.json). The standard report verifier recalculates metrics and checks source citations, raw-output decoding and checked-output consistency. Evaluation tooling passed 154 unit tests, lint and TypeScript checking. Application inference/UI code was unchanged, so browser/production builds were not rerun for this evaluation-only change. Early unit-test execution may affect observed latency; these are not controlled performance measurements.

[Machine-readable consistency verification](novel-generalization-v1-verification.json) and [runtime after](novel-generalization-v1-runtime-after.json). All 24 model calls completed; no fallback. Fixed expected requirements define the 48-judgment metric; any additional model-proposed requirements are not scored in that headline.
