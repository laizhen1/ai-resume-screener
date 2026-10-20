# Architecture

## Principles

1. Local, no-storage behavior remains the default.
2. Uploaded documents are persisted only in explicit PostgreSQL workspace mode.
3. Model-selected evidence categories are mapped by a fixed policy and checked against source evidence. Criterion scores are separate, uncalibrated suggestions; a deterministic engine remains an explicit offline fallback.
4. Embeddings provide advisory evidence and do not alter the overall score.
5. Every workspace mutation creates an audit event.
6. External providers sit behind narrow adapters and have offline fallbacks.

## Runtime modes

| Concern | Local default | Workspace option |
| --- | --- | --- |
| Repository | Process-memory store | PostgreSQL and pgvector |
| Analysis jobs | Inline | Redis list and worker |
| Authentication | Disabled for a private machine | Signed, HTTP-only session |
| Core analysis | Configured local Ollama; deterministic fallback | Same versioned analysis contract |
| Embeddings | Deterministic token hash | Ollama embedding model |
| OCR | Tesseract.js for images | Configured scanned-PDF OCR endpoint |

## Components

The App Router application exposes three experiences:

- The private analyzer performs one-off extraction and matching without persistence.
- The review workspace owns jobs, rubrics, candidate batches, evidence, reviewer notes, comparison, retention and audit history.
- The evaluation laboratory compares six pipelines on versioned development, reused diagnostic and new challenge sets; the repeated-fixture regression tool remains separate.

Known job requirements are extracted and normalized using the skill dictionary. The model selects exact résumé passage IDs, semantic categories and explanations, with a separate field for additional source-cited requirements. A fixed policy maps categories to four verdicts; production composition validates identity, quotations and source eligibility. Criterion scoring is separate and is not recalibrated by those checks. Repository and queue interfaces isolate storage and worker concerns from UI routes.

## Data flow

1. Validate the file size, extension and signature.
2. Extract text in memory and reject suspiciously empty results.
3. Parse sections, extract job requirements and attach source offsets to evidence.
4. Map selected evidence categories to supported, partial, contradicted or unknown, then apply source/eligibility checks; retain original output and abstention reasons.
5. Save the candidate only in the selected repository mode.
6. Execute analysis inline or enqueue it for the Redis worker.
7. Persist the versioned result and an audit event.
8. Require human review for any workflow status change.

## Deployment boundary

Docker Compose provides a portfolio-grade single-host deployment. It is not a claim of enterprise multi-tenancy. A public deployment still requires TLS, secret management, database backups, encrypted storage, infrastructure log retention and an external security review.

## Optional transformer service

The Node analyzer can call a local Python FastAPI service for Sentence Transformers retrieval, cross-encoder reranking, DeBERTa NLI and optional token classification. `ENABLE_TRANSFORMER_ANALYSIS=true` adds an independent source-verified evidence panel to both analyzer and workspace results. The original score and requirement assessments remain unchanged. The service receives bounded passage text and requirement skills; model IDs and bearer credentials stay in server configuration.

The evaluation runner explicitly opts into three additional variants with `includeTransformers`. Existing JSON report storage accepts their additive fields. `/api/resume-qa` uses the same retrieval service and local Ollama to return individually cited claims. Stored candidate source is fetched only after authorization; public-demo text and uploads remain stateless.

See [service setup](../services/model-service/README.md) and [transformer methodology](transformer-experiments.md).

## Fully local deployment scope

Ollama and the Python transformer service support local inference; BM25 + dense retrieval, RRF and cross-encoder reranking support cited Q&A. Local data handling depends on model, OCR and storage endpoints being local. See [privacy](privacy.md) for payloads and configurable external boundaries, and [project progress](progress.md) for implementation versus measured validation.
