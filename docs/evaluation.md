# Evaluation laboratory

Dataset version: **adversarial-context-v2.0**.

The evaluation laboratory is a reproducible regression harness, not a hiring-validity or fairness study. `npm run evaluate -- 120` deterministically repeats a versioned set of adversarial fixtures so latency and regression behavior can be compared at different run sizes.

## Challenge coverage

Fixtures cover exact terminology, aliases, explicit negation, learning-only language, ambiguous technical terms, missing evidence, required/preferred phrasing, name replacement and harmless formatting changes. Expected labels are supported, partial, contradicted or unknown for each recognized requirement.

These checked-in fixtures are intentionally independent from the synthetic résumé generator. They prevent the benchmark from merely repeating the same canonical skill strings used to create its inputs.

## Reported metrics

- **Contextual accuracy:** correct four-way requirement verdicts.
- **Support precision, recall and F1:** quality of the supported verdict specifically.
- **Negation false-positive rate:** contradicted claims incorrectly marked supported; lower is better.
- **Aspirational false-positive rate:** learning-only claims incorrectly marked supported; lower is better.
- **Abstention rate:** requirements deliberately returned as unknown.
- **Evidence coverage:** non-unknown verdicts with exact source evidence.
- **Counterfactual consistency:** stable verdicts after candidate-name replacement.
- **Format consistency:** stable verdicts after benign whitespace changes.
- **Average confidence and Brier score:** rule-strength confidence and its correctness error.
- **Average latency:** local analyzer time per case.

An abstention is not automatically an error: an expected unknown should be counted as a correct contextual verdict. Brier score evaluates the stated rule confidence, not confidence that someone is qualified.

## Release interpretation

A change should be investigated when contextual accuracy, support F1, evidence coverage or robustness decreases, or when negation/aspirational false-positive rates or Brier score increase. The CI command records the output today; teams can add numeric failure thresholds after establishing stable history across meaningful engine changes.

## Before making external claims

A credible external evaluation needs a separately versioned and held-out dataset, published annotation rules, multiple annotators and agreement measurement, representative document formats and languages, subgroup and error analysis, and confidence intervals. Synthetic fixture metrics must never be presented as proof of fairness, competence inference or job-performance validity.
