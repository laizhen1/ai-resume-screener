# New-example probe v2 — unchanged v12 engine

Recorded 2026-10-29. On 16 first-use synthetic documents (32 judgments), unchanged engine **3.6.0** scored **28/32 (87.5%)**, four-class macro F1 **0.8576** after checks; raw DeepSeek scored **27/32**. There were **4 checked mismatches**. Documents and provisional agent labels were frozen before this single-pass run. These are new examples of partly familiar mechanisms, not independently annotated or family-disjoint evaluation.

## Protocol

One fresh DeepSeek-R1-Distill-Qwen-7B generation per document, shared by raw and checked pipelines; no tuning, relabeling, retries to select a better score or model downloads. Engine source hashes stayed unchanged. Classes: {"supported":8,"contradicted":9,"unknown":8,"partial":7}. Two documents contain Chinese; JSON object and root-array cases exercise extracted text, not PDF/DOCX/OCR ingestion. Exact duplicate checks passed against historical report examples; maximum word-trigram Jaccard overlap was 0.1143. Lexical novelty is not family independence. The author knew prior failures and authored both examples and provisional labels. No confidence interval is claimed for this purposively selected, clustered synthetic sample.

## Measured results

| Pipeline | Correct | Accuracy | Four-class macro F1 | Model documents | Fallback | p50 ms | p95 ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| rules | 20/32 | 62.5% | 0.5879 | 0 | 0 | 1 | 6 |
| llm | 27/32 | 84.4% | 0.8169 | 16 | 0 | 33485 | 53401 |
| hybrid | 28/32 | 87.5% | 0.8576 | 16 | 0 | 33487 | 53404 |

Checks repaired 1 raw error and introduced 0 errors on previously correct raw judgments. This comparison measures the check layer on shared generations, not the causal effect of each v12 change versus v11.

## Remaining checked mismatches

- **novel2-03 / python**: expected **unknown**, actual **contradicted**. Citation: "附件中的招聘广告写着“熟练使用 Python”，这是目标岗位的要求。". Explanation: [evidence-category-v1: applicant_explicitly_denies_skill] explicit denial of experience
- **novel2-09 / angular**: expected **unknown**, actual **partial**. Citation: "[{\"owner\":\"Fictional N09\",\"note\":\"I am taking introductory React lessons and following guided component exercises.\"},{\"owner\":\"target employer\",\"note\":\"Angular experience is requested by the vacancy.\"}]". Explanation: Explicit source boundary: contradicted → partial. Original model: [evidence-category-v1: applicant_explicitly_denies_skill] I am taking introductory React lessons and following guided component exercises.
- **novel2-10 / aws**: expected **unknown**, actual **partial**. Citation: "AWS 是我明年计划阅读的主题，目前没有开始学习。". Explanation: [evidence-category-v1: applicant_learning_skill] Applicant explicitly states that they are currently learning AWS via introductory materials, which aligns with the 'applicant_learning_skill' category.
- **novel2-11 / tailwind**: expected **unknown**, actual **supported**. Citation: "| Tailwind project | [applicant to complete] |". Explanation: [evidence-category-v1: applicant_used_skill] Applicant's Tailwind project is described as professional work.

All predictions and exact input text are preserved in the results; rationale for each reference is in the frozen input. Once inspected, these cases become diagnostic/regression material. Do not silently retune and replace this first-use score. Any fixes require a new version and report. Broad generalization and real hiring outcomes remain unmeasured.

## What this probe shows

Transfer is incomplete. The checked pipeline correctly classified all 8 supported, 7 partial and 9 contradicted references, but only 4/8 unknown references. This tiny, selected sample supports a narrow conclusion: recognizing absence of applicant evidence remains less reliable than the positive/learning/denial cases tested here.

- **Chinese advert (03):** the selected quote is exact, but it describes the vacancy, not a denial by the applicant. The model miscategorized it and the boundary checks did not intercept this wording.
- **JSON array (09):** the entire array became one quote. The model initially returned contradicted; the check layer borrowed React learning context and changed Angular to partial. Both are wrong. This is an incorrect adjustment, even though it does not count as a correct-to-incorrect regression in the paired metric. Root arrays are outside v12's object-value passage extraction.
- **Chinese future plan (10):** the quote explicitly says study has not begun, but the explanation claims current study. Exact citation validity does not establish semantic consistency.
- **Unfilled worksheet (11):** the placeholder was treated as delivered Tailwind work. This is the one false supported prediction in the checked run.

The check layer correctly repaired the contractor-owned Terraform claim in case 07. Fresh temporal cases 01 and 06, nested-object case 02 and the positive delivery controls passed. These observations do not establish improvement over v11 on this set because v11 was not run here.

Next implementation candidates are skill-and-owner scoped extraction for arrays, broader multilingual non-claim handling and placeholder recognition, with positive controls. Preserve this first-use result when making any later changes.

## Verification and artifacts

[Inputs, labels, rationales, novelty audit and source hashes](novel-generalization-v2-frozen.json); [raw and checked results](novel-generalization-v2-results.json); [errors](novel-generalization-v2-errors.json); [consistency verification](novel-generalization-v2-verification.json); runtime [before](novel-generalization-v2-runtime-before.json) and [after](novel-generalization-v2-runtime-after.json). Historical [v12 regression results](deepseek-v12-results.md) remain unchanged.

No application code changed in this evaluation task. The existing 200 unit tests, 15 browser tests, lint and build passed during v12 implementation; they were not rerun for this report-only task. Report consistency, source/model stability and documentation links were checked. Private Chinese career notes remain ignored. Nothing was committed or pushed.
