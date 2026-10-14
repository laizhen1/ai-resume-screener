# AI foundations implementation verification

Verified locally on 2026-09-21 using Windows, Node 24.19, and Python 3.12 for model dependencies.

| Check | Result |
| --- | --- |
| TypeScript unit/integration tests | 41 passed |
| Python data, metrics, retrieval, HTTP and FAISS tests | 16 passed with optional dependencies installed |
| ESLint / Next.js production build | Passed |
| Existing browser suite | 4 passed |
| Updated classifier/entity panel browser test | Passed on desktop and mobile; source highlights and abstention displayed |
| Existing 120-case regression and development accuracy gate | Passed |
| Promptfoo CLI with local HTTP fixture | 2 passed; both provider settings and all assertions exercised |
| Training/reload smoke | Both tiny random BERT heads trained, saved, reloaded, and evaluated on separate smoke test files |
| Evidence baseline comparison | Exported actual application rules and evaluated the trained smoke checkpoint alongside cached DeBERTa NLI |
| Real-model FAISS retrieval | All five variants completed on four synthetic retrieval cases using cached MiniLM embedding/reranker checkpoints |

The tiny random NER model had zero exact-span F1; the tiny evidence model had 25% accuracy. These expected poor smoke-model results confirm that actual outputs are measured instead of fabricating improvement. The four simple retrieval cases gave all variants Recall@2, MRR@2, and nDCG@2 of 1; this does not distinguish retrieval quality or establish a FAISS speed advantage. Use a larger independently labeled corpus for meaningful comparisons.

Ollama was unavailable. The real Promptfoo provider correctly returned errors and a nonzero exit status; no LLM-quality pass is claimed. `npm run test:prompts` is explicitly an HTTP-fixture integration test, not an evaluation of an LLM.

Windows protection prevented Python from writing inside the OneDrive repository. Training checkpoints and Python reports were verified in Windows Temp. Reproduce with the commands in [the training guide](../docs/model-training.md), substituting a writable output directory. No smoke model was enabled as the application's default classifier.

Dependency installation reported existing advisories in Next.js, Vitest / its mocker, xmldom and js-yaml. These require a separate dependency update; this implementation does not claim a clean security audit. The newly introduced Promptfoo dependency was pinned to avoid its newer vulnerable archive-extraction dependency.
