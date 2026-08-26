# Privacy and data handling

## Memory mode

Memory mode is the default:

- Files and extracted text exist for the duration of a request or server process.
- No resume, result or reviewer note is written to an application database.
- Ollama generation receives only a fictional role and seniority.
- Embeddings run through the configured local adapter.
- The project does not include analytics or third-party telemetry.

## PostgreSQL workspace mode

Workspace mode is opt-in and stores resume text, analysis results, reviewer notes, statuses, retention dates and audit events. Candidates can be deleted immediately, and the retention endpoint removes expired records.

Operators are responsible for TLS, encryption at rest, database access control, backups, regional requirements and infrastructure logs. Deleting the application record does not automatically delete an operator's backups.

## OCR

Image OCR runs through local Tesseract.js. Scanned PDFs are sent to an external service only when the operator explicitly configures `OCR_ENDPOINT`. That service becomes a data processor and must be assessed separately.

## Authentication

Private local mode can disable authentication. Shared deployments must enable signed HTTP-only sessions, replace the development secret and use a generated scrypt password hash. The built-in single-user authentication is appropriate for a portfolio deployment, not enterprise identity governance.

## Prohibited direction

Do not add protected-attribute inference, personality or emotion inference, automatic rejection, covert monitoring, resume-claim verification presented as fact, or training on uploaded resumes without explicit consent.
