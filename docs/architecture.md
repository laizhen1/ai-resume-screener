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

Known job requirements are extracted and normalized using the skill dictionary. The model selects exact résumé passage IDs, semantic categories and explanations, with a separate field for additional source-cited requirements. A fixed policy maps categories to four verdicts; production composition validates identity, quotations and source eligibility. The skills score is recalculated from checked requirement verdicts; the other criteria remain uncalibrated model suggestions, with the original rubric retained. Repository and queue interfaces isolate storage and worker concerns from UI routes.

## Guided Studio frontend

The root layout provides the shared header, active navigation, skip link and footer. The analyzer owns a three-step client workflow: role context, résumé input and evidence review. Job descriptions require 40 characters; pasted résumés require 80. Client file checks reject empty, unsupported or oversized uploads before submission; server signature and extraction validation remain authoritative.

Step navigation retains form state. Source changes invalidate results and the Q&A snapshot; analysis locks inputs and captures the exact text/file used. Abort controllers cancel pending analysis and clean up requests on unmount, with guards against late responses. Focus moves only after an actual step change, including under React Strict Mode.

The AnalysisResults component preserves all requirement quotes, provider/fallback labels, reliability details, optional transformer review/Q&A, advisory scores and interview prompts. The cobalt/light-surface stylesheet applies across all routes, reflows the workflow on mobile and keeps evaluation tables within scrollable panels. BrandMark, the public SVG and the App Router icon share the document/evidence-check mark. No external fonts or visual-asset requests were added.

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


### Evidence-consistent scoring — 2026-10-28

Engine 3.3.0 introduces `checked-skills-v1`: the LLM skills component is recomputed from final checked judgments (supported 1, partial 0.4, contradicted/unknown 0), equally weighted across requirements. No requirements gives zero evidence credit. Experience, impact and clarity remain uncalibrated model suggestions. The original model rubric and aggregate remain inspectable in the analysis and exported JSON. Reviewer corrections remain separate. Rule-only scoring is unchanged. Archived v8 measurements are preserved; this change is not a live DeepSeek evaluation rerun.


The authenticated, rate-limited GET /api/model-status uses a five-second tags request without sending résumé text. Per-analysis diagnostics distinguish generation outcomes and expose elapsed time before optional reviewer-summary generation. scripts/compare.ts loads project configuration before running the same model pipeline; scripts/prepare-review.ts exports blinded review packets and validates provenance fields, hashes and complete judgment keys.


Engine 3.7.1 uses exact sentence-scoped passages and per-requirement alias-aware candidate excerpts. These hints contain no verdicts. The model still selects evidence and categories; v8 checks restore bounded source context where needed and enforce explicit learning/denial boundaries with an audit trail. Valid supported quotes retain their scope instead of importing older denials from a broader line. Comparison reports include prompt/schema hashes and response metadata; runtime manifests capture Ollama/model versions.
