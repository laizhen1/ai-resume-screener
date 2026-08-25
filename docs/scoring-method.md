# Scoring method

The overall result is a weighted sum of four deterministic criteria:

| Criterion | Weight | Current signal |
| --- | ---: | --- |
| Relevant skills | 55% | Detected job skills also detected in the resume |
| Demonstrated experience | 20% | Distinct delivery-oriented action terms |
| Measurable impact | 15% | Quantified outcome expressions |
| Document clarity | 10% | Common section headings and sufficient extracted text |

This is a transparent baseline, not a validated prediction of job performance. Keyword matching can miss synonyms, transferable experience, spelling variants and context. Conversely, detecting a term does not prove proficiency.

## Evaluation before real-world use

A meaningful evaluation should publish:

- A synthetic or properly consented dataset
- Annotation instructions and inter-rater agreement
- Skill detection precision and recall
- Error rates across resume formats and languages
- Sensitivity to name and demographic proxies
- Versioned test conditions, hardware and model details

Do not advertise performance, cost savings, fairness or latency numbers until they have reproducible evidence.
