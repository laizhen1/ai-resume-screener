# Evaluation laboratory

The evaluation laboratory is a reproducible regression harness, not a hiring-validity study.

`npm run evaluate -- 120` generates a deterministic corpus across frontend, backend, machine-learning, cloud and data roles. Each case contains a synthetic job, a synthetic resume and canonical expected skills.

## Reported metrics

- Precision: supported skill predictions that are expected
- Recall: expected supported skills that are detected
- F1: harmonic mean of precision and recall
- Counterfactual consistency: unchanged output after replacing the synthetic candidate name
- Average latency: local analyzer time per case

The evaluation dashboard stores the dataset size, engine version, metrics and timestamp so regressions are visible across releases.

## Before making external claims

A credible external evaluation needs a separately versioned dataset, documented annotation rules, multiple annotators and agreement measurement, representative document formats and languages, error analysis, and confidence intervals. Synthetic metrics must never be presented as proof of fairness or job-performance validity.
