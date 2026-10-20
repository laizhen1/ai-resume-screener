# Evidence Intelligence

Engine version: **3.2.0**. Rules method: **contextual-rules-v1**. Model category policy: **evidence-category-v1**. Evidence checks: **evidence-eligibility-v1**.

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

Results report evidence coverage, extraction quality and abstained requirements. Confidence is either a rule-strength estimate or the model's uncalibrated self-assessment; it is not a hiring probability. Four model-generated criterion scores are separate from requirement verdicts and are not recalibrated after eligibility checks. See [scoring](scoring-method.md) and [current measured results](progress.md).

## Semantic boundary

When local Ollama embeddings are enabled, the system retrieves possible evidence only for unknown requirements. Retrieved sentences are advisory, retain provenance and never modify the deterministic score. If Ollama fails, semantic retrieval abstains instead of displaying token-hash similarity as semantic understanding.

## Known limitations

The rules do not reliably understand every synonym, implied competency, time span, proficiency level, multilingual phrase or complex negation. A skill mention does not prove competence, and missing résumé evidence does not prove missing ability. Future classifiers require an independently annotated dataset, subgroup analysis and explicit release gates before influencing scoring.
