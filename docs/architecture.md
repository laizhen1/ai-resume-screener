# Architecture

## Principles

1. Local, no-storage behavior remains the default.
2. Uploaded documents are persisted only in explicit PostgreSQL workspace mode.
3. The employment score is deterministic, inspectable and versioned.
4. Embeddings provide advisory evidence and do not alter the overall score.
5. Every workspace mutation creates an audit event.
6. External providers sit behind narrow adapters and have offline fallbacks.

## Runtime modes

| Concern | Local default | Workspace option |
| --- | --- | --- |
| Repository | Process-memory store | PostgreSQL and pgvector |
| Analysis jobs | Inline | Redis list and worker |
| Authentication | Disabled for a private machine | Signed, HTTP-only session |
| Generation | Built-in synthetic generator | Ollama |
| Embeddings | Deterministic token hash | Ollama embedding model |
| OCR | Tesseract.js for images | Configured scanned-PDF OCR endpoint |

## Components

The App Router application exposes three experiences:

- The private analyzer performs one-off extraction and matching without persistence.
- The review workspace owns jobs, rubrics, candidate batches, evidence, reviewer notes, comparison, retention and audit history.
- The evaluation laboratory runs a generated synthetic corpus and stores versioned regression results.

The analysis boundary is split into extraction, structured parsing, deterministic scoring and advisory semantic matching. Repository and queue interfaces prevent UI routes from depending directly on PostgreSQL or Redis.

## Data flow

1. Validate the file size, extension and signature.
2. Extract text in memory and reject suspiciously empty results.
3. Parse sections and attach source offsets to evidence.
4. Save the candidate only in the selected repository mode.
5. Execute analysis inline or enqueue it for the Redis worker.
6. Persist the versioned result and an audit event.
7. Require human review for any workflow status change.

## Deployment boundary

Docker Compose provides a portfolio-grade single-host deployment. It is not a claim of enterprise multi-tenancy. A public deployment still requires TLS, secret management, database backups, encrypted storage, infrastructure log retention and an external security review.
