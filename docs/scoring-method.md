# Scoring method

Engine version: **2.0.0**. Taxonomy version is returned with every result.

The deterministic overall result is a weighted sum of four criteria. Workspace rubrics may change the weights, but they must total 100.

| Criterion | Default weight | Signal |
| --- | ---: | --- |
| Relevant skills | 55% | Canonical job skills also supported in the resume |
| Demonstrated experience | 20% | Distinct delivery-oriented action terms |
| Measurable impact | 15% | Quantified outcome expressions |
| Document clarity | 10% | Common section headings and sufficient text |

Each criterion includes an explanation, verbatim evidence, section name and character offsets. Missing skills produce verification questions rather than rejection decisions.

## Semantic evidence

When enabled, the analyzer embeds missing job skills and resume sentences, then displays high-similarity sentences as advisory evidence. The embedding provider, similarity and exact source sentence remain visible. Semantic matches do not alter the deterministic overall score.

The offline token-hash embedding exists for reproducible development behavior; it is not a substitute for a semantic model.

## Known limitations

Keyword signals can miss synonyms, transferable experience, negation, proficiency and context. Detecting a skill does not prove competence. Action verbs and numbers are weak proxies and can be gamed. Document clarity can be affected by extraction quality.

The score is therefore an inspectable prioritization aid, not a prediction of job performance.
