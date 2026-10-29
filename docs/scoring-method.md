# Scoring method

Engine version: **3.7.1**. The taxonomy and engine versions are returned with every result.

The overall result is a weighted sum of four criteria. With Ollama, `checked-skills-v1` recomputes Relevant skills from final checked verdicts; experience, impact and clarity retain uncalibrated model suggestions. Workspace weights must total 100. Original model criteria and their aggregate remain in `originalModelRubric` for inspection and JSON export. Reviewer corrections never silently change the automated score. Invalid or unavailable generation uses the labeled deterministic fallback.

| Criterion | Default weight | Deterministic fallback signal |
| --- | ---: | --- |
| Relevant skills | 55% | Contextual verdicts for recognized job requirements |
| Demonstrated experience | 20% | Distinct delivery-oriented action terms |
| Measurable impact | 15% | Quantified outcome expressions |
| Document clarity | 10% | Common section headings and sufficient text |

## Contextual skill score

Each detected job skill becomes a requirement. Requirements inherit required, preferred or unspecified importance from their source sentence, but importance is descriptive in version 3 and does not silently override the configured rubric.

Both the checked model skills component and deterministic fallback give supported evidence full skill credit, partial evidence 40%, and contradicted or unknown evidence none. Its skill score is:

```text
100 × (supported + 0.4 × partial) / detected requirements
```

With no detected requirements, the checked model skills component is 0 (insufficient evidence); the unchanged legacy rules fallback uses 50. Requirement importance does not weight individual skills. This fixes score/verdict inconsistency, not score calibration.

Every resolved verdict includes a reason, verbatim evidence, section name and character offsets. Unknown requirements create verification questions rather than rejection decisions.

## Reliability and confidence

Evidence coverage is the proportion of requirements with a supported, partial or contradicted verdict. Unknown requirements are explicit abstentions. Extraction quality is based on document length and recognized structure.

The deterministic path exposes rule-strength estimates, evaluated with Brier score in the regression suite. The model path exposes uncalibrated self-assessment values constrained to 0, 0.25, 0.5, 0.75 or 1. Neither is a probability of competence, qualification or future job performance. The four-way verdict is the fixed mapping of a model-selected evidence category, followed by source checks.

## Semantic evidence

When enabled, the analyzer embeds unknown job skills and résumé sentences, then displays high-similarity sentences as advisory candidates. The provider, similarity and exact source sentence remain visible. Semantic candidates do not alter verdicts or the deterministic overall score.

The offline token-hash embedding exists for reproducible development behavior. It is not a semantic model and is not presented to users as semantic evidence. When the configured local model is unavailable, semantic retrieval abstains.

## Known limitations

Contextual rules can miss synonyms, transferable experience, complex negation, proficiency, recency and multilingual context. Detecting a skill does not prove competence. Action verbs and numbers are weak proxies and can be gamed. Document clarity can be affected by extraction quality.

The score is therefore an inspectable prioritization aid, not a prediction of job performance.
