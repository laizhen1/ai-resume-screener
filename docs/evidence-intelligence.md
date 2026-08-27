# Evidence Intelligence

Engine version: **3.0.0**. Context method: **contextual-rules-v1**.

The engine evaluates whether a résumé contains inspectable evidence for each recognized job requirement. It does not predict job performance, infer protected attributes, validate claims as facts, or decide who should progress.

## Requirement model

Each recognized requirement records:

- canonical skill and taxonomy version;
- required, preferred or unspecified importance inferred from the source sentence;
- the original job-description sentence;
- supported, partial, contradicted or unknown verdict;
- contextual-rule confidence and a plain-language reason;
- exact résumé sentence, section and character offsets when evidence exists.

## Verdict policy

| Verdict | Meaning | Score treatment |
| --- | --- | ---: |
| Supported | Explicitly listed or linked to delivery/professional experience | Full skill credit |
| Partial | Learning, coursework, familiarity or limited exposure | 40% skill credit |
| Contradicted | The résumé explicitly negates or limits the experience | No skill credit |
| Unknown | Evidence is missing or the term is ambiguous | No skill credit; human verification prompt |

Contradiction takes precedence over a positive keyword in the same evidence set. This conservative policy reduces the risk of presenting a negated claim as support. It can also miss nuance, so reviewers must inspect the quoted source.

## Reliability summary

Every result reports evidence coverage, average contextual-rule confidence, extraction quality and the requirements on which the system abstained. Confidence describes how strongly a deterministic pattern supports its verdict. It is not candidate-quality confidence and must not be shown as a hiring probability.

## Semantic boundary

When local Ollama embeddings are enabled, the system retrieves possible evidence only for unknown requirements. Retrieved sentences are advisory, retain provenance and never modify the deterministic score. If Ollama fails, semantic retrieval abstains instead of displaying token-hash similarity as semantic understanding.

## Known limitations

The rules do not reliably understand every synonym, implied competency, time span, proficiency level, multilingual phrase or complex negation. A skill mention does not prove competence, and missing résumé evidence does not prove missing ability. Future classifiers require an independently annotated dataset, subgroup analysis and explicit release gates before influencing scoring.
