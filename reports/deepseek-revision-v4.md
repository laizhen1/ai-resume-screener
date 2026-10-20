# DeepSeek revision: requirement identity and grounded evidence judgments

Run date: 2026-10-20. This update fixes the shared identity contract between model output, displayed analysis and evaluation, and revises the evidence instructions. No weights were trained or fine-tuned.

## Changes

- `canonicalRequirementName` maps existing exact aliases and bounded wrappers (for example `Python experience`, `Experience in Python`, `K8s experience`) to canonical names. It does not use substring or fuzzy matching; Java/JavaScript, C#/C++, unfamiliar competencies and compound requirements remain distinct.
- Application output and evaluation use the same identity function. Conflicting duplicate judgments abstain with an explicit reason and cleared evidence, regardless of ordering. The old first-judgment-wins behavior is removed.
- Requirement source quotes must occur verbatim in the job; evidence quotes must occur verbatim in the résumé. Invalid sources cause abstention, rather than replacing a fabricated job quote with unrelated job text.
- The first prompt revision, `core-analysis-v2`, supplied skill names and stronger evidence instructions but still let the model rewrite quotations. Its complete development result was only 16/24 raw and 8/24 validated. That unsuccessful result is retained as `development-deepseek-v2.json`; no v2 run on the 24-document diagnostic was performed.
- The intermediate contract, `core-analysis-v3-grounded`, introduced required requirement IDs and constrained source-passage IDs. It scored 14/24 raw and 15/24 validated on the diagnostic, and the public walkthrough regressed to 2/4. Those results are retained.
- The final contract, `core-analysis-v4-evidence-first`, uses skill names as keys instead of opaque IDs, excludes standalone section headings from selectable passages, and orders evidence selection/explanation before the verdict. Its JSON Schema requires every known requirement key and constrains evidence IDs to existing passages. The application supplies canonical names, importance and job source text; DeepSeek supplies verdicts, confidence, explanations and passage selections. Unknown requirements outside the catalog can still be returned in `additionalRequirements` and undergo the same source validation.
- The instructions distinguish applicant work, learning, negation, aspirations, third-party work and instructions embedded in source documents. The unchanged classification policy is stated more explicitly, without supplying expected labels.
- The prompt requests zero measurable-impact score without a quantified outcome. Scores are still uncalibrated suggestions, not validated estimates of ability.
- Engine `3.1.0` and alignment `canonical-wrapper-v2` are recorded. Original reports remain unchanged.

## Evaluation design

The final v4 contract followed an unsuccessful v2 development run and mixed v3 development/diagnostic/walkthrough results. Each revision and protocol amendment is retained. V4 was frozen before its development, diagnostic and public-example runs. The model is `deepseek-r1:7b`, digest `755ced02ce7befdb13b7ca74e1e4d08cddba4986afdb63a480f2c93d3140383f`, through local Ollama 0.40.6. Settings remain temperature 0.6, seed 42, reasoning enabled, context 8192, output budget 4096 and timeout 180 seconds. No label changes or expected verdicts were supplied to inference.

First, the saved v1 raw drafts were replayed through the corrected alignment and current validation, with **zero live model calls**. Replay latency fields are zero placeholders and must not be interpreted as inference performance. This provides a baseline under the corrected processing contract, rather than attributing a metric correction to a better model.

The replay recovered all 17 previously unmatched names. The old output's raw score changes from 9/24 under exact-name matching to **15/24**, and its validated score changes from 10/24 to **13/24** under current processing. This is a re-evaluation of existing outputs; it is not a model improvement. Original and replayed artifacts are both retained.

The final live v4 run used the ten development documents, followed by the 24 previously inspected documents. The latter retains `heldout` in its legacy CLI identifier, but its metadata now explicitly identifies it as a diagnostic. Prior errors and previous runs informed these revisions, so they cannot support an unbiased generalization claim. All labels are synthetic/provisional and lack independent human adjudication. This is an iterative engineering diagnostic, not a clean held-out test.

The new `llm` pipeline denotes decoded model judgments with application-supplied requirement identities and source texts, not unrestricted end-to-end extraction by a model. Raw transport output is retained in `modelOutput`, and the decoded draft in `modelDraft`. The new input contract is part of the engineering change. A better result is not evidence that model weights improved or a measurement of prompt wording alone.

Known-requirement quotations are now reconstructed from selected passage IDs, so their exact-source validity is largely guaranteed by construction. The model can still select the wrong passage or misinterpret it. Tests explicitly verify that decoding does not silently replace wrong model verdicts with rule/reference labels. Additional requirements and rubric quotations remain free text and are checked separately.

Input limits remain bounded: up to 12,000 job characters and 20,000 resume characters; the grounded contract uses up to 100 nonempty line chunks of at most 500 characters. Long or heavily line-broken documents may be truncated. These diagnostics do not test long-document coverage, multilingual performance or unfamiliar-skill extraction quality.

Reported classification metrics score the dataset's expected requirements. They do not measure every additional requirement the model may invent, quote relevance at the span level, or rubric-score calibration. Those remain separate evaluation gaps.

## Actual measurements

| Dataset / configuration | Pipeline | Correct | Macro F1 | Missing names | Invalid citations* | Model cases / fallbacks |
|---|---|---:|---:|---:|---:|---:|
| 24-document diagnostic / v1 saved-output replay | rules | 20/24 | 0.8314 | 0.0% | 0.0% | 0 / 0 |
| 24-document diagnostic / v1 saved-output replay | llm | 15/24 | 0.6111 | 0.0% | 47.6% | 24 / 0 |
| 24-document diagnostic / v1 saved-output replay | hybrid | 13/24 | 0.5344 | 0.0% | 0.0% | 24 / 0 |
| 10-document development / v2 prompt-only | rules | 24/24 | 1.0000 | 0.0% | 0.0% | 0 / 0 |
| 10-document development / v2 prompt-only | llm | 16/24 | 0.4433 | 4.2% | 27.3% | 10 / 0 |
| 10-document development / v2 prompt-only | hybrid | 8/24 | 0.2460 | 4.2% | 0.0% | 10 / 0 |
| 10-document development / v3 opaque IDs | rules | 24/24 | 1.0000 | 0.0% | 0.0% | 0 / 0 |
| 10-document development / v3 opaque IDs | llm | 16/24 | 0.6129 | 0.0% | 0.0% | 10 / 0 |
| 10-document development / v3 opaque IDs | hybrid | 16/24 | 0.6129 | 0.0% | 0.0% | 10 / 0 |
| 24-document diagnostic / v3 opaque IDs | rules | 20/24 | 0.8314 | 0.0% | 0.0% | 0 / 0 |
| 24-document diagnostic / v3 opaque IDs | llm | 14/24 | 0.5298 | 0.0% | 4.8% | 24 / 0 |
| 24-document diagnostic / v3 opaque IDs | hybrid | 15/24 | 0.5958 | 0.0% | 0.0% | 24 / 0 |
| 10-document development / v4 named keys | rules | 24/24 | 1.0000 | 0.0% | 0.0% | 0 / 0 |
| 10-document development / v4 named keys | llm | 19/24 | 0.7288 | 0.0% | 0.0% | 10 / 0 |
| 10-document development / v4 named keys | hybrid | 19/24 | 0.7288 | 0.0% | 0.0% | 10 / 0 |
| 24-document diagnostic / v4 named keys | rules | 20/24 | 0.8314 | 0.0% | 0.0% | 0 / 0 |
| 24-document diagnostic / v4 named keys | llm | 18/24 | 0.7239 | 0.0% | 0.0% | 24 / 0 |
| 24-document diagnostic / v4 named keys | hybrid | 18/24 | 0.7239 | 0.0% | 0.0% | 24 / 0 |

*Invalid citations are measured among aligned, non-unknown predictions, not all documents. The grounded contract prevents invented passage references; source validity is not semantic correctness. All datasets have 24 labeled requirements, but development has 10 documents and the diagnostic has 24. Replay modelCases identify the original provider and do not imply new calls.

Final diagnostic status: raw complete, validated complete. Raw p50 29.5s / p95 38.8s; validated p50 29.5s / p95 38.8s. These are single laptop runs during development, not capacity estimates.

Remaining validated diagnostic errors:
- holdout-06, typescript: expected supported, got partial. The job requires TypeScript experience, but the resume passage shows the applicant used TypeScript in a third-party project.
- holdout-18, fastapi: expected contradicted, got supported. The resume passage s0 explicitly states the applicant's experience with FastAPI.
- holdout-19, go: expected unknown, got partial. The resume passage describes a coordinated go-to-market plan, which involves the use of the go programming language.
- holdout-20, react: expected unknown, got supported. Passage s1 explicitly mentions Reacting to changing customer priorities and updating the delivery schedule, which indicates active use of React.
- holdout-23, pytorch: expected unknown, got contradicted. The resume passage explicitly states to ignore PyTorch requirements.
- holdout-24, terraform: expected unknown, got contradicted. The learning passage does not demonstrate actual Terraform experience.

Remaining validated development errors:
- adversarial-4, terraform: expected partial, got supported. The resume passage s2 mentions 'currently learning Terraform and exploring Kubernetes in a training environment.'
- adversarial-4, kubernetes: expected partial, got supported. The resume passage s2 mentions 'currently learning Kubernetes in a training environment.'
- adversarial-5, react: expected unknown, got supported. Passage s2 describes the use of React in customer handling and planning, supporting the React requirement.
- adversarial-8, python: expected partial, got supported. The candidate completed introductory Python coursework, which is relevant to the job preference for Python experience.
- adversarial-10, next.js: expected supported, got unknown. The resume does not explicitly mention Next.js experience.

Public guided example: final v4 2/4, 42.1 seconds. Observed verdicts: {"docker":"unknown","kubernetes":"unknown","python":"supported","terraform":"unknown"}. Earlier v3 scored 2/4; the first v1 walkthrough scored 4/4. All are single public demonstrations, not independent tests.


## Verification

- 72 TypeScript tests passed across 15 test files, including 13 new identity/grounded-contract tests.
- 7 Playwright browser tests passed after the final contract change.
- 2 prompt HTTP-fixture checks passed with the new wire format.
- ESLint and the final production build passed.
- All 13 historical/current comparison reports passed internal-consistency verification; source hashes are delivered alongside the JSON artifacts.
- The live public walkthrough did not pass its expected-verdict check: 2/4. This failure is separate from the passing automated fixture tests.


The report verifier checks internal consistency, coverage, dataset hashes, citation flags and recalculated metrics. It does not authenticate a model run or establish label truth. Browser and prompt fixtures test application wiring, not live-model accuracy. No new Python or transformer implementation was changed in this update.

## Interpretation

On the same previously inspected 24-document diagnostic, the corrected v1 replay scored 15/24 raw and 13/24 validated; the live v4 pipeline scored 18/24 and 18/24. The validated difference is +5 judgments. Rules scored 20/24. This describes a local engineering result on a reused synthetic diagnostic, not a statistical or real-world improvement claim.

Final development performance is 19/24 raw and 19/24 validated, versus rules 24/24. The contract fixes identity and source-copying problems but does not guarantee correct interpretation or calibrated scores.

All attempted revisions are retained: v2's poor development result, v3's mixed diagnostic (14/24 raw, 15/24 validated) and failed public demonstration (2/4), and final v4. V4 was frozen before its single development, diagnostic and public-example runs. These are disclosed iterative diagnostics; they must not be represented as a single untouched test or an unbiased improvement estimate.

For a new generalization claim, independently author and review new document families, freeze a separate test set before tuning, and evaluate the same model and processing contract on every case. Keep naming coverage, citation validity, classification errors, abstention and score calibration separate.
