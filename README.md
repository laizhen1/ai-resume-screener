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
- Sentence Transformers retrieval, cross-encoder reranking and DeBERTa NLI evidence review through an optional local Python service
- Cited résumé Q&A and configurable fine-tuned BERT/DistilBERT entity-extraction inference
- Six-way evaluation of rules, LLM, verified LLM, dense NLI, reranked NLI and rules/transformer outputs
- Job workspaces, batches of up to ten resumes, review states, notes and comparisons
- In-memory private demo mode or opt-in PostgreSQL/pgvector persistence
- Redis-backed background analysis with an inline local fallback
- Retention dates, permanent deletion, audit history, signed sessions and rate limits
- A versioned adversarial benchmark covering aliases, negation, aspirational language, ambiguity, missing evidence, formatting changes and counterfactual consistency
- Unit, Playwright, CI, Docker Compose and operational documentation

## Local private demo

Requirements: Node.js 22.22+ and npm 10+ (the Promptfoo development tooling requires Node 22.22+).

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The default `DATA_MODE=memory`, `QUEUE_MODE=inline` and disabled authentication require no database, model or API key. Data disappears when the server process ends.

## Run locally with PyTorch

With Python 3.12 and Node.js installed, run from the project root:

```sh
npm run models:setup
npm run dev:ml
```

Setup creates `.venv` and installs the inference and fine-tuning dependencies. If Python is not on PATH, set `MODEL_PYTHON` to the full path of its Python 3.12 executable before setup. If OneDrive or folder protection prevents environment creation, set `MODEL_VENV` in `.env.local` to a writable directory outside OneDrive. The first model startup downloads several GB of pretrained weights into `.model-cache`; later runs reuse them. `HF_HOME` can relocate this cache outside OneDrive too.

`dev:ml` starts the local PyTorch service, waits for model readiness, and launches Next.js with transformer analysis enabled. Analyze a résumé to see source-linked evidence in the existing transformer panel. Ctrl+C stops both processes. If either process exits, the launcher stops the other. The launcher refuses an occupied model-service port.

Use `npm run models:start` for the Python service alone and `npm run models:check` in another terminal to verify installed dependencies and live model readiness. Standalone `npm run dev` still needs `ENABLE_TRANSFORMER_ANALYSIS=true` in `.env.local` to enable this panel.

The launcher loads Next.js development environment files for both processes, including `.env.local`. It defaults to CPU and `http://127.0.0.1:8000`. Set `MODEL_DEVICE=cuda` only with a compatible PyTorch/CUDA installation. `MODEL_STARTUP_TIMEOUT_MS` defaults to 900000 (15 minutes); increase it for slow first-time downloads. `MODEL_SERVICE_TOKEN` is shared between the service and app. `npm run dev:ml -- --port 3001` selects a different web port.

Pretrained transformer results remain advisory. Fine-tuning your own résumé model requires reviewed training data; see [model training](docs/model-training.md).

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

### Training, prompt testing, and retrieval evaluation

The following workflows are implemented. See the [training and evaluation guide](docs/model-training.md) for setup, commands, data contracts, and interpretation.

| Step | Implementation | Validation / output |
| --- | --- | --- |
| 1. Fine-tuned entity extraction | Hugging Face/PyTorch BERT or DistilBERT training with exact span-to-BIO alignment; checkpoint deployment through `NER_MODEL` | Entity precision/recall/F1, training-only dictionary baseline, source-span highlights |
| 2. Requirement–evidence classifier | Four-class fine-tuning, optional `EVIDENCE_MODEL`, independent passage verdicts in the review panel | Rules/NLI comparisons, macro F1, confusion matrix, false-supported rate, calibration diagnostics, abstention curves, per-case errors |
| 3. Promptfoo | Regression suite using the real Ollama analysis function, separate schema/citation/verdict assertions, local-model CI gate | `npm run eval:prompts`; offline HTTP-fixture wiring check with `npm run test:prompts` |
| 4. Retrieval evaluation | BM25, dense search, reciprocal-rank fusion, cross-encoder reranking, optional FAISS `IndexFlatIP` | Recall@k, MRR@k, nDCG@k, latency, and reproducible JSON reports |

Training checks document/template separation and exact-text leakage, saves dataset hashes and model metadata, and never reads the existing held-out benchmark. The [bundled datasets](datasets/smoke/README.md) are tiny fictional smoke fixtures, not a reviewed training corpus. The training/reload smoke test uses randomly initialized tiny BERTs; no useful domain model or accuracy improvement is claimed. Supply independently reviewed data and evaluate a trained checkpoint before enabling it for review.

Q&A now uses hybrid retrieval by default. Set `RETRIEVAL_MODE=dense` in the Python service to use the previous dense candidate selection. FAISS is optional and request-scoped; it does not persist résumés or share passages between requests. Fine-tuned classifier outputs remain advisory and do not change the main score.

### Local transformer stack

The optional model service adds a measurable transformer pipeline:

```text
Exact résumé passages → Sentence Transformers → cross-encoder → DeBERTa NLI
                                      ↓                              ↓
                            cited Q&A with Ollama          independent evidence review
```

Default checkpoints are `sentence-transformers/all-MiniLM-L6-v2`, `cross-encoder/ms-marco-MiniLM-L-6-v2`, and `MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli`. Transformer judgments appear alongside the existing analysis and do not change the main score. An optional `NER_MODEL` enables a fine-tuned token-classification checkpoint; this repository does not include a newly trained résumé extractor.

Start the full stack with the model-service override:

```bash
docker compose -f docker-compose.yml -f docker-compose.models.yml up --build
```

The first start downloads model weights; subsequent starts reuse the model cache. Ollama remains a separate local service and is needed for generated Q&A answers, not transformer classification. For a Python-only model service alongside `npm run dev`, see [model-service setup, configuration and API](services/model-service/README.md).

```bash
npm run compare -- --split development --with-transformers --output reports/development-transformers.json
npm run compare -- --split heldout --with-transformers --with-model --model qwen3:4b --output reports/all-models.json
```

On `/evaluation`, enable **Include transformers + reranking** to compare dense retrieval, reranking and the rules/transformer hybrid. Model failures stay visible as unavailable results. Exports include model names, resolved revisions, runtime versions, raw NLI probabilities and source passages. See [transformer methodology and limitations](docs/transformer-experiments.md). Actual CPU runs showed pure NLI below the rules baseline. Rules + transformers matched rules on development (24/24) and got 21/24 provisional held-out judgments correct versus rules' 20/24. This is one additional correct judgment on a small, provisionally labeled set, not established real-world improvement. See [complete measured results](reports/README.md); transformer results remain advisory.

### Existing baseline and LLM comparisons

Open `/evaluation` to compare rules, LLM-only judgments, evidence-validated hybrid outputs and the optional transformer variants on the same examples.

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

The displayed rule confidence is the strength of the contextual rule judgment—not a probability that a candidate is qualified. Transformer panels display uncalibrated model probabilities separately. See [evidence intelligence](docs/evidence-intelligence.md), [scoring](docs/scoring-method.md), [evaluation](docs/evaluation.md) and [transformer experiments](docs/transformer-experiments.md).

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

## Future implementation

- **Step 5 — Standardize structured outputs:** extend JSON Schema-constrained generation to Q&A, evidence review, and synthetic generation; share schema definitions with runtime validation; distinguish schema failures from unsupported claims. Main analysis already uses structured output, but this cross-application standardization is future work.
- **Step 6 — MCP server:** expose authenticated, workspace-scoped, read-only tools such as `search_resume_evidence`, `get_analysis_report`, and `compare_experiment_runs`, returning source references and preserving existing access controls. No MCP server is implemented yet.

## License

Apache License 2.0. Third-party packages remain under their respective licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
