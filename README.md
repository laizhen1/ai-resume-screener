# Open Resume Lab

Open Resume Lab is a privacy-first, explainable candidate-evidence and evaluation platform. Its Evidence Intelligence engine extracts job requirements, distinguishes demonstrated, learning-only, contradicted and unknown résumé evidence, applies a versioned deterministic rubric, and keeps employment decisions with a human reviewer.

It is a learning and decision-support system, not an automated hiring system. Use fictional or properly consented data only.

## What it demonstrates

- PDF, DOCX, TXT, PNG and JPEG ingestion with signature validation and a 5 MB limit
- Structured résumé sections, job requirements and exact evidence provenance
- Context-aware requirement verdicts for supported, partial, contradicted and unknown evidence
- Explicit abstention, extraction-quality signals and evidence-coverage reporting
- Ollama-powered requirement extraction, evidence judgments, scoring explanations and interview prompts with a deterministic offline fallback
- Optional Ollama generation and embedding adapters with deterministic offline fallbacks
- Job workspaces, batches of up to ten resumes, review states, notes and comparisons
- In-memory private demo mode or opt-in PostgreSQL/pgvector persistence
- Redis-backed background analysis with an inline local fallback
- Retention dates, permanent deletion, audit history, signed sessions and rate limits
- A versioned adversarial benchmark covering aliases, negation, aspirational language, ambiguity, missing evidence, formatting changes and counterfactual consistency
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

## AI/ML experiment lab

Open `/evaluation` to compare rules, LLM-only judgments and evidence-validated hybrid outputs on the same examples.

- **Separate datasets:** 10 unique development documents and 24 unique provisional held-out documents, identified by SHA-256 fingerprints.
- **Quality and performance:** confusion matrices, macro F1, support precision/recall, abstention, citation validity, error categories and p50/p95 latency.
- **Evidence review:** inspect highlighted source quotes and record audited reviewer corrections without changing frozen labels or historical metrics.
- **Reproducible experiments:** export JSON reports, compare saved runs and run a development accuracy gate in CI.
- **Transparent model failures:** unavailable LLM results and deterministic hybrid fallbacks are explicitly labeled.

### Run a comparison

```bash
# Rules baseline; no model required
npm run compare -- --split development --min-accuracy 0.90 --output reports/development.json
npm run compare -- --split heldout --output reports/heldout-rules.json

# Requires an installed model running in local Ollama
npm run compare -- --split heldout --with-model --model qwen3:4b --output reports/heldout-comparison.json
```

The measured rules baseline achieved **24/24 correct development judgments** and **20/24 correct held-out judgments (83.3%)**. The held-out set exposed four errors despite every prediction having an exact source citation. These are small, fictional, agent-authored datasets with provisional labels; independent human annotation is still pending. LLM performance was not measured because Ollama was unavailable during verification.

See [measured results and portfolio talking points](reports/README.md) and [experiment methodology, dataset card and metric definitions](docs/experiments.md).

PostgreSQL users must run `npm run db:migrate` to add report storage. Memory-mode reports and feedback last only until the server restarts. The original repeated-fixture suite remains at `/evaluation/regression`.

## Quality and evaluation

```bash
npm test
npm run evaluate -- 120
npm run lint
npm run build
npm run test:e2e
```

The benchmark is a deterministic regression suite, not evidence of real-world hiring validity or fairness. Its fixtures are intentionally difficult and report contextual accuracy, support precision/recall/F1, negation and learning-only false positives, abstention, evidence coverage, confidence error, robustness and latency. Publish independent dataset construction and annotation details before making external performance claims.

## Evidence Intelligence engine

The version 3 pipeline is evidence-first and AI-assisted when Ollama is available:

1. Extract canonical skills from each job sentence and label them required, preferred or unspecified.
2. Find exact or aliased résumé evidence with section and character-offset provenance.
3. Ask the configured local Ollama model to classify each requirement as supported, partial, contradicted or unknown; every quoted evidence fragment is verified against the original resume.
4. Abstain when a term is missing or ambiguous instead of converting uncertainty into a match.
5. Ask Ollama to score the configured criteria and explain its evidence; the weighted overall score is calculated from those validated criterion scores. If Ollama is unavailable or returns unverifiable JSON, the versioned deterministic engine is used.
6. Optionally retrieve advisory semantic candidates with a local Ollama embedding model. Semantic candidates never alter the score.

The displayed confidence is the strength of the contextual rule judgment—not a probability that a candidate is qualified. See [evidence intelligence](docs/evidence-intelligence.md), [scoring](docs/scoring-method.md) and [evaluation](docs/evaluation.md).

## Architecture

```text
Browser
  |-- private analyzer ---------- extraction -> requirement evidence -> deterministic score
  |-- review workspace ---------- jobs -> candidates -> evidence -> human review
  |                                  |                     |
  |                                  |                     +-> audit + retention
  |                                  +-> Redis worker -> hybrid analysis
  |-- evaluation laboratory ----- synthetic corpus -> versioned metrics
  |
  +-- memory repository (default) or PostgreSQL + pgvector (opt-in)
```

The embedding layer produces advisory semantic candidates and does not change the deterministic overall score. If the configured local model is unavailable, that stage explicitly abstains; the token-hash development fallback is never presented as semantic evidence. Every analysis records its engine and taxonomy versions.

Read [architecture](docs/architecture.md), [scoring](docs/scoring-method.md), [evaluation](docs/evaluation.md), [privacy](docs/privacy.md) and the [threat model](docs/threat-model.md).

## Responsible-use boundary

Do not use the score as the sole basis for an employment decision. The system does not infer protected attributes, personality or emotion; automatically reject candidates; validate resume claims; or determine whether a person is qualified. Reviewers must inspect original evidence and consider transferable experience, accommodations and context.

## License

Apache License 2.0. Third-party packages remain under their respective licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
