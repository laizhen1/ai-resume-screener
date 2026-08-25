# Open Resume Lab

A local-first foundation for experimenting with explainable resume-to-job matching without using real candidate data or paying per AI token.

The application can generate fictional resumes, read PDF/DOCX/TXT documents, identify relevant skills, produce a weighted score, show supporting evidence, and suggest fair interview questions. It is a learning and decision-support project—not an automated hiring system.

## Why this project is different

- **Free by default:** it works offline with deterministic logic. Optional generation uses a local [Ollama](https://ollama.com/) model.
- **Privacy conscious:** documents are processed in memory and are not stored by the application.
- **Explainable:** each score has a visible weight, reason and extracted evidence.
- **Safe demonstrations:** generated people, employers and achievements are fictional; email addresses use `example.com`.
- **Provider independent:** the AI integration is isolated so other local providers can be added later.

## Current capabilities

- Synthetic resume generation with an Ollama-first, offline-fallback design
- Job description and resume comparison
- PDF, DOCX and TXT text extraction (5 MB limit)
- Transparent skill, experience, impact and clarity criteria
- Missing-skill verification questions
- Responsive web interface
- Unit tests and GitHub Actions checks
- Docker and local development setup

## Quick start

Requirements: Node.js 20.9+ and npm 10+.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. No model or API key is required.

## Optional free local AI

Install Ollama, then download a small model once:

```bash
ollama pull qwen3:4b
```

Copy `.env.example` to `.env.local`, start Ollama, then start the app. Generation automatically falls back to the built-in generator if the local model is unavailable. Model downloads require disk space and adequate memory but have no per-token fee.

## Quality checks

```bash
npm test
npm run lint
npm run build
```

## Architecture

```text
Browser
  ├─ POST /api/generate ── Ollama on localhost
  │                         └─ built-in fallback
  └─ POST /api/analyze ─── in-memory document extraction
                            └─ deterministic explainable scorer
```

There is intentionally no database in the foundation release. Avoiding persistence reduces privacy risk and keeps local setup simple. A future opt-in batch mode can add PostgreSQL and pgvector with retention controls.

See [docs/architecture.md](docs/architecture.md), [docs/scoring-method.md](docs/scoring-method.md) and [docs/privacy.md](docs/privacy.md) for design decisions.

## Responsible-use boundary

Do not use the score as the sole basis for an employment decision. The system does not determine whether someone is qualified, detect protected attributes, rank candidates for automatic rejection, or validate that statements are true. A person must review the original application and consider transferable experience, accommodations and context.

## Roadmap

- Configurable criteria and skill taxonomies
- Local embedding option and semantic skill equivalence
- OCR for scanned documents
- Anonymous-view mode for identifying details
- Curated synthetic evaluation suite with precision/recall reporting
- Opt-in PostgreSQL/pgvector batch comparison
- Additional local model adapters

## Contributing

Issues and pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md). Security concerns should follow [SECURITY.md](SECURITY.md).

## License

Apache License 2.0. Third-party packages remain under their respective licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
