# Third-party notices

This project depends on open-source packages installed through `package.json`. Their original copyright holders and licenses apply.

Key direct dependencies include:

| Package | Purpose | License |
| --- | --- | --- |
| Next.js | Web application framework | MIT |
| React | User interface | MIT |
| Zod | Runtime validation | MIT |
| Mammoth.js | DOCX text extraction | BSD-2-Clause |
| pdf-parse | PDF text extraction | MIT |
| node-postgres (`pg`) | PostgreSQL access | MIT |
| node-redis (`redis`) | Background queue transport | MIT |
| Tesseract.js | Local image OCR | Apache-2.0 |
| Vitest | Testing | MIT |
| Playwright | End-to-end browser testing | Apache-2.0 |
| tsx | TypeScript script execution | MIT |
| Promptfoo | Local LLM regression evaluation (development only) | MIT |
| @libsql/client | Promptfoo database adapter resolution (development only) | MIT |

Ollama is an optional external local service and is not redistributed by this repository. Models downloaded through Ollama can have their own licenses; users must review the license of the model they select.

Run the package manager's license-report tooling before every public release and update this file when direct dependencies change.

## Optional transformer dependencies and models

The optional Python service uses FastAPI, Uvicorn, PyTorch, Transformers, Sentence Transformers, SentencePiece and protobuf. Training additionally uses Accelerate; optional vector indexing uses FAISS CPU. Their upstream licenses apply independently of this repository's Apache-2.0 license. Installations resolve their own dependency versions; consult the installed package metadata.

Default model weights are downloaded separately from Hugging Face. Review their model cards and licenses before redistribution:

- [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- [ms-marco-MiniLM-L-6-v2](https://huggingface.co/cross-encoder/ms-marco-MiniLM-L-6-v2)
- [DeBERTa-v3-base-mnli-fever-anli](https://huggingface.co/MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli)
- [DistilBERT base uncased](https://huggingface.co/distilbert/distilbert-base-uncased) (default training initialization)

Any administrator-configured NER or replacement model has its own license and evaluation requirements. No model weights are bundled with this repository.
