# Architecture

## Principles

1. Local-first behavior must remain functional without an AI service.
2. Uploaded files must not be persisted in the foundation release.
3. Scoring must be deterministic, inspectable and tested.
4. AI-generated content must not control the employment score.
5. External providers must sit behind narrow interfaces.

## Components

The Next.js application contains the browser interface and two server routes:

- `/api/generate` validates the requested role and level, tries the configured Ollama endpoint, validates its JSON, and safely falls back to a randomized offline generator.
- `/api/analyze` reads an uploaded document into memory or accepts pasted text, then invokes the deterministic analyzer.

`lib/documents.ts` owns format-specific extraction. `lib/skills.ts` owns the initial skill vocabulary and aliases. `lib/analyzer.ts` produces a weighted result and evidence. `lib/synthetic.ts` owns both generation paths and validates model output.

## Why matching is not delegated to an LLM

LLM scoring can be unstable, difficult to reproduce and hard to audit. This release uses AI only to create fictional test content. Matching uses version-controlled rules that contributors can inspect and evaluate.

## Intended extension points

- Replace the static skill catalog with a versioned taxonomy.
- Add an embedding interface for semantic equivalence while retaining lexical evidence.
- Add storage through an opt-in repository interface with explicit deletion and retention behavior.
- Add local model adapters beside Ollama rather than inside UI or scoring code.
