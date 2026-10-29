# Evidence Intelligence

Engine version: **3.7.1**. Rules method: **contextual-rules-v1**. Model category policy: **evidence-category-v1**. Evidence checks: **evidence-boundaries-v8**.

The engine evaluates whether a résumé contains inspectable evidence for each recognized job requirement. It does not predict job performance, infer protected attributes, validate claims as facts, or decide who should progress.

## Model path and source validation

The dictionary and aliases extract known job skills, importance and source text. The model receives canonical requirement keys and bounded source-passage IDs, selects semantic evidence categories and explanations, and may propose additional source-cited job requirements.

A fixed policy maps seven categories to four verdicts: personal use → supported; learning → partial; explicit denial → contradicted; future intention, others' work, unrelated wording/instructions, or missing/ambiguous evidence → unknown. The model does not directly emit the final verdict.

Production composition checks requirement identity, exact quotations and evidence eligibility. Ordinary-word senses, external ownership without applicant involvement, and recognizable document instructions can cause abstention. Original model output and check reasons remain inspectable. This is bounded source validation, not learned weights or proof that every interpretation is correct.

## Requirement model

Each recognized requirement records:

- canonical skill and taxonomy version;
- required, preferred or unspecified importance inferred from the source sentence;
- the original job-description sentence;
- supported, partial, contradicted or unknown verdict;
- uncalibrated model confidence or contextual-rule strength, a reason, and any evidence-check audit;
- exact résumé sentence, section and character offsets when evidence exists.

## Rules-baseline verdict policy

| Verdict | Meaning | Score treatment |
| --- | --- | ---: |
| Supported | Explicitly listed or linked to delivery/professional experience | Full skill credit |
| Partial | Learning, coursework, familiarity or limited exposure | 40% skill credit |
| Contradicted | The résumé explicitly negates or limits the experience | No skill credit |
| Unknown | Evidence is missing or the term is ambiguous | No skill credit; human verification prompt |

Contradiction takes precedence over a positive keyword in the same evidence set. This conservative policy reduces the risk of presenting a negated claim as support. It can also miss nuance, so reviewers must inspect the quoted source.

## Reliability summary

Results report evidence coverage, extraction quality and abstained requirements. Confidence is either a rule-strength estimate or the model's uncalibrated self-assessment; it is not a hiring probability. The skills criterion is recomputed from checked verdicts; experience, impact and clarity remain uncalibrated model suggestions. The original model rubric is retained. See [scoring](scoring-method.md) and [current measured results](progress.md).

## Semantic boundary

When local Ollama embeddings are enabled, the system retrieves possible evidence only for unknown requirements. Retrieved sentences are advisory, retain provenance and never modify the deterministic score. If Ollama fails, semantic retrieval abstains instead of displaying token-hash similarity as semantic understanding.

## Known limitations

The rules do not reliably understand every synonym, implied competency, time span, proficiency level, multilingual phrase or complex negation. A skill mention does not prove competence, and missing résumé evidence does not prove missing ability. Future classifiers require an independently annotated dataset, subgroup analysis and explicit release gates before influencing scoring.

V2 restores exact source-line context (bounded to 1,000 characters) for applicant involvement and instruction scope. Explicit beginner coursework can constrain supported to partial; strict present-tense denial takes priority over a model's partial/supported category. Unknown judgments are not promoted. Each adjustment retains the original model verdict and audit reason. This is a hybrid pipeline policy, not independent confirmation of résumé claims.

## Reviewed scope policy — engine 3.7.1

Missing claims, placeholders, quoted adverts and future plans do not establish an explicit denial. Beginner or supervised sample exercises indicate partial evidence; a current explicit denial still takes priority over simultaneous learning. A dated denial can be superseded by an explicit retraction and later delivery. JSON string values are scoped to the skill being checked. Supplier ownership alone and forged review instructions cannot establish applicant work.

The v8 checks can correct a non-unknown model judgment using explicit source boundaries, including contradicted to partial for documented beginner study, or contradicted to supported when an old denial is explicitly retracted and later delivery is present. Selected fragments can expand to an exact source line of at most 1,000 characters for these corrections. Unknown judgments are never promoted. These are bounded policy checks, not a general semantic verifier; raw outputs, adjusted verdicts and source spans remain inspectable. See the versioned evaluation reports for actual effects and failures.
Recognized non-claim patterns are checked across supported, partial and contradicted predictions. Unrecognized paraphrases can still be misclassified; these checks are not a complete semantic verifier. Explicit delivery and current-denial controls protect genuine work and genuine denials.

The source composer preserves an already-valid supported quote instead of expanding it into a broader line containing an older denial. Expansion remains available for non-supported judgments or a detected source boundary, including learning with a nearby explicit denial. Every correction retains its source and original verdict.


V12 adds exact string-value passage scoping for JSON objects and Chinese-sentence passage scoping, broader non-claim patterns and date-ordered retraction checks. The date rule requires a later delivery year and explicit retraction; it is not a general temporal inference engine. Unknown judgments and missing citations are not promoted. See [v12 results](../reports/deepseek-v12-results.md) for actual measured coverage and residual errors.


V13 extends exact string-value passage extraction and skill-filtered boundary checks to JSON root arrays. It adds bounded Chinese advert/future-study and English vacancy/placeholder handling, with genuine delivery controls. Values are separated without a general JSON ownership/path interpreter. See [v13 results](../reports/deepseek-v13-results.md).
