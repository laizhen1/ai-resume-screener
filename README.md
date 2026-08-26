# Open Resume Lab

Open Resume Lab is a privacy-first, explainable candidate-matching and evaluation platform. It extracts resume evidence, applies a versioned deterministic rubric, offers advisory local semantic matches, and keeps employment decisions with a human reviewer.

It is a learning and decision-support system, not an automated hiring system. Use fictional or properly consented data only.

## What it demonstrates

- PDF, DOCX, TXT, PNG and JPEG ingestion with signature validation and a 5 MB limit
- Structured resume sections and exact evidence provenance
- Configurable, versioned skill, experience, impact and clarity scoring
- Optional Ollama generation and embedding adapters with deterministic offline fallbacks
- Job workspaces, batches of up to ten resumes, review states, notes and comparisons
- In-memory private demo mode or opt-in PostgreSQL/pgvector persistence
- Redis-backed background analysis with an inline local fallback
- Retention dates, permanent deletion, audit history, signed sessions and rate limits
- A reproducible synthetic benchmark reporting precision, recall, F1, latency and name-counterfactual consistency
- Unit, Playwright, CI, Docker Compose and operational documentation

## Local private demo

Requirements: Node.js 20.9+ and npm 10+.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The default `DATA_MODE=memory`, `QUEUE_MODE=inline` and disabled authentication require no database, model or API key. Data disappears when the server process ends.

## Complete workspace stack

Docker Compose starts the web application, PostgreSQL with pgvector, Redis, a migration job and an analysis worker:

```bash
docker compose up --build
```

The compose file uses local-demo credentials and disables authentication. Change the database credentials, set `AUTH_DISABLED=false`, provide a random `AUTH_SECRET`, and create `AUTH_PASSWORD_HASH` before exposing the service:

```bash
npm run auth:hash -- your-password
```

See `.env.example` and [operations](docs/operations.md).

## Optional local AI and OCR

Synthetic generation can use `qwen3:4b`; semantic evidence can use `nomic-embed-text` through Ollama. Both paths fall back safely when unavailable.

```bash
ollama pull qwen3:4b
ollama pull nomic-embed-text
```

PNG and JPEG OCR runs locally through Tesseract.js. Text PDFs are parsed locally. Scanned PDFs require a configured `OCR_ENDPOINT` or conversion to page images; this boundary avoids silently accepting empty extraction results.

## Quality and evaluation

```bash
npm test
npm run evaluate -- 120
npm run lint
npm run build
npm run test:e2e
```

The generated benchmark is a regression suite, not evidence of real-world hiring validity or fairness. Publish dataset construction and annotation details before making performance claims.

## Architecture

```text
Browser
  |-- private analyzer ---------- in-memory extraction -> deterministic score
  |-- review workspace ---------- jobs -> candidates -> evidence -> human review
  |                                  |                     |
  |                                  |                     +-> audit + retention
  |                                  +-> Redis worker -> hybrid analysis
  |-- evaluation laboratory ----- synthetic corpus -> versioned metrics
  |
  +-- memory repository (default) or PostgreSQL + pgvector (opt-in)
```

The embedding layer produces advisory semantic evidence and does not change the deterministic overall score. Every analysis records its engine and taxonomy versions.

Read [architecture](docs/architecture.md), [scoring](docs/scoring-method.md), [evaluation](docs/evaluation.md), [privacy](docs/privacy.md) and the [threat model](docs/threat-model.md).

## Responsible-use boundary

Do not use the score as the sole basis for an employment decision. The system does not infer protected attributes, personality or emotion; automatically reject candidates; validate resume claims; or determine whether a person is qualified. Reviewers must inspect original evidence and consider transferable experience, accommodations and context.

## License

Apache License 2.0. Third-party packages remain under their respective licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
