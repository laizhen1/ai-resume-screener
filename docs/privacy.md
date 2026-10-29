# Privacy and data handling

## Memory mode

Memory mode is the default:

- Files and extracted text exist for the duration of a request or server process.
- No resume, result or reviewer note is written to an application database.
- Core Ollama analysis receives bounded job-description and résumé text, requirement keys and source passages. Reviewer summaries and Q&A receive the relevant source context. Only the fictional-profile generator uses role/seniority rather than an uploaded résumé.
- The optional transformer service and embedding adapter receive bounded source text and queries for retrieval or evidence analysis. No-storage mode does not mean no model-service transmission.
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


## Conditions for local processing

The project supports fully local inference, not an unconditional promise that all deployments keep data on one machine. Ollama and the transformer service default to loopback addresses, but `OLLAMA_BASE_URL`, `MODEL_SERVICE_URL`, `OCR_ENDPOINT` and storage configuration can point elsewhere. A locally running app may still transmit source text to those configured services.

Keep the app, model services, OCR and storage on the intended machine or trusted deployment boundary. Model weights and OCR language assets may need downloading before offline use; asset downloads are distinct from résumé uploads. Operator and provider logging/retention must also be considered. The documented capability is support for fully local inference.


Readiness checks send no documents to the configured Ollama tags endpoint. They return the configured model name and bounded status only. Review exports contain document text: use fictional data or obtain consent. Label reviewer identifiers should be pseudonymous. Runtime diagnostics never return service URLs or raw errors.
