# Training and retrieval experiments

Steps 1–4 are implemented as local training, inference, and evaluation workflows. The bundled data verifies the software; it is not enough to train a useful résumé model. No new domain-quality improvement is claimed. Keep the existing provisional held-out benchmark out of training.

## Install

Use Python 3.12 in an activated model-service environment and Node.js 22.22+ (required by the Promptfoo tooling):

```sh
python -m pip install -r services/model-service/requirements-training.txt
python -m pip install -r services/model-service/requirements-faiss.txt
npm ci
```

On Windows, use the Python executable from [model-service setup](../services/model-service/README.md). If OneDrive/Windows protection blocks Python writes, set output paths to a directory under `$env:TEMP` instead of `artifacts/`. Checkpoints and training data stay local; Hugging Face downloads contain model weights, not uploaded résumés. Training manifests and evaluation reports can contain source quotations or document identifiers; use fictional or consented data and retain them accordingly.

## 1. Entity extraction with BERT / DistilBERT

Create `train`, `validation`, and `test` JSONL files following the [dataset card](../datasets/smoke/README.md). Each NER row has original text and exact character spans for `SKILL`, `TOOL`, `QUALIFICATION`, `JOB_TITLE`, and `DATE`. Empty entity lists are valid negatives.

```sh
python services/model-service/train.py --task ner --train datasets/smoke/ner.train.jsonl --validation datasets/smoke/ner.validation.jsonl --model distilbert/distilbert-base-uncased --output artifacts/ner-run --epochs 3 --cpu
python services/model-service/evaluate_model.py --checkpoint artifacts/ner-run/model --test datasets/smoke/ner.test.jsonl --output reports/ner-test.json
```

These commands demonstrate the workflow with smoke fixtures. Replace all three data paths with a reviewed corpus before assessing quality. `--model` also accepts compatible BERT checkpoints or a local snapshot; `--revision` selects a Hub revision. The default is DistilBERT, not a model trained from scratch.

The trainer aligns BIO labels to subword offsets, ignores special tokens, and rejects misaligned spans or sequences longer than the model window instead of silently truncating annotations. It selects the checkpoint by validation entity F1. The standalone evaluator computes exact character-span entity precision/recall/F1, lists every prediction/error, and compares against a phrase dictionary learned only from training annotations. This dictionary is an extraction baseline, not the application's evidence rules.

Set `NER_MODEL` in the Python service environment to the resulting `model` directory and restart. The existing extracted-entities panel displays highlighted source spans and model labels. Finding a skill entity does not establish demonstrated experience.

## 2. Requirement–evidence classification

Evidence rows contain a requirement, a source passage, and one of `supported`, `partial`, `contradicted`, or `unknown`. All four labels must occur in training.

```sh
python services/model-service/train.py --task evidence --train datasets/smoke/evidence.train.jsonl --validation datasets/smoke/evidence.validation.jsonl --output artifacts/evidence-run --epochs 3 --cpu
npm run ml:baseline -- datasets/smoke/evidence.test.jsonl reports/evidence-rules.json
python services/model-service/evaluate_model.py --checkpoint artifacts/evidence-run/model --test datasets/smoke/evidence.test.jsonl --rules-baseline reports/evidence-rules.json --with-nli --output reports/evidence-test.json
```

The rules exporter requires a supported canonical `skill` in each row; unknown taxonomy entries fail rather than masquerading as a baseline prediction. Baseline file hashes must match the exact test file. `--with-nli` loads the existing local transformer stack and compares its delivery/learning NLI policy on the same supplied passages. It evaluates classification with fixed evidence, not end-to-end retrieval quality.

Reports include macro F1, per-class precision/recall, confusion matrices, false-supported rate (false positives divided by gold non-supported cases), Brier score, ten-bin expected calibration error, confidence/coverage curves, challenge slices, and per-case predictions. Deterministic/NLI verdict baselines are encoded one-hot; their probability metrics do not represent calibrated model confidence. Threshold curves show diagnostics; do not select production thresholds on the test set. Use validation data and independent calibration data for tuning.

Training uses only train/validation inputs. Evaluation rejects shared row IDs, document IDs, source/template groups, or normalized exact text with either training split. Near duplicates and incorrect group assignments still require human review. Manifests record seed, arguments, package versions, base revision, split hashes, label mappings, and validation metrics. Preserve the checkpoint and manifest together. Output training directories must be empty, preventing accidental replacement of earlier runs.

Enable the trained checkpoint in the model-service process:

```dotenv
EVIDENCE_MODEL=/absolute/path/to/artifacts/evidence-run/model
EVIDENCE_THRESHOLD=0.8
```

`POST /classify-evidence` accepts `{ "pairs": [{ "requirement": "Python experience is required.", "passage": "Completed a Python course." }] }`. It returns four-class probabilities, a verdict, and an explicit `abstained` flag. `/analyze` also returns independent predictions for its retrieved passages. The app renders those in the transformer panel without changing its main score. `unknown` as a model class is distinct from low-confidence abstention. The default threshold is a configurable experimental setting, not a calibrated guarantee.

The existing `/evaluation` six-way experiment remains unchanged; new fine-tuned classifier comparisons are exported through the CLI above. Deploy only a checkpoint you have independently evaluated, not the smoke-test weights.

## 3. Promptfoo regression tests

```sh
# Requires a running local Ollama with deepseek-r1:7b installed
npm run eval:prompts
# Requires no Ollama: tests the CLI/provider/assertion path against an HTTP fixture
npm run test:prompts
```

`evaluations/promptfooconfig.yaml` compares two temperature settings using the application's actual analysis function and current prompt. Add provider entries with `config.model` to compare installed models, or set `OLLAMA_ANALYSIS_MODEL` in the shell. Prompt changes are tested by rerunning the same versioned cases before and after the code change; the displayed Promptfoo prompt is a label, not an alternative application prompt.

Cases cover work, coursework, negation, missing evidence, future intentions, team attribution, and injected instructions. Separate assertions check application schema validity, exact source citations, and the expected verdict. Quote presence alone is not semantic support. These assertions cannot certify every free-text explanation: human review of unsupported claims remains necessary.

The runner disables telemetry, result caching, and database writes; it exports `reports/promptfoo.json` and places configuration/logs under ignored `tmp/promptfoo`. Use synthetic inputs: exported reports/logs can contain prompts and responses. Provider failures fail the run without substituting rules. CI runs the fixture smoke test; `.github/workflows/llm-evaluation.yml` is an opt-in quality gate for a self-hosted runner labeled `ollama` with the model preinstalled. Fixture passes are not LLM quality measurements.

Promptfoo is pinned to 0.122.1 to avoid the `extract-zip` dependency advisory introduced by later releases at implementation time. `@libsql/client` is explicitly installed as a development dependency so the hoisted ORM can resolve its adapter. Update these together and rerun `npm run test:prompts` when upgrading.

## 4. Evaluated retrieval and FAISS

`/retrieve` supports BM25 keyword search, normalized dense search, or reciprocal-rank fusion (`hybrid`), followed optionally by the existing cross-encoder. Q&A now defaults to hybrid search; configure `RETRIEVAL_MODE=dense` to retain the prior dense candidate selection. Python environment configuration:

```dotenv
RETRIEVAL_MODE=hybrid
RETRIEVAL_BACKEND=numpy
```

Set `RETRIEVAL_BACKEND=faiss` after installing `requirements-faiss.txt`. FAISS uses an exact `IndexFlatIP` over normalized embeddings. Both the NumPy and FAISS paths search only the current request's passages; no index persists personal data or mixes documents across requests. At the current 160-passage limit, FAISS is an integration/benchmark option, not an established speedup. The PostgreSQL vector schema is not used by this request-scoped index.

For Docker, set `INSTALL_FAISS=true` and `RETRIEVAL_BACKEND=faiss` before rebuilding the model-service override. Local trained checkpoints must be mounted into the container, with `NER_MODEL` / `EVIDENCE_MODEL` set to container paths; host paths are not automatically available.

```sh
# Keyword-only benchmark requires no model packages
python services/model-service/evaluate_retrieval.py --data datasets/smoke/retrieval.jsonl --output reports/retrieval-keyword.json --k 2
# Compare keyword, dense, hybrid, and reranked variants
python services/model-service/evaluate_retrieval.py --data datasets/smoke/retrieval.jsonl --output reports/retrieval-faiss.json --with-models --backend faiss --k 2
```

Each case supplies query, scoped passages, and relevant passage IDs. Reports include Recall@k, MRR@k, nDCG@k, p50/p95 latency, model revisions, dataset hash, and retrieved IDs. Timing excludes model loading and is not a capacity benchmark. These ranking metrics do not measure generated answer correctness; the Q&A path still validates citations and its existing tests cover invalid citations and abstention.

The API also accepts optional `mode`, `backend`, `topK` (1–40), `resultK` (1–20), and `rerank`. The Q&A client continues requesting the default three final passages. Installing FAISS is explicit; requesting it without the package returns a visible failure, not a silent backend substitution.

## Verify without downloading new weights

```sh
python -m unittest discover -s services/model-service -p 'test_*.py'
python services/model-service/smoke_training.py --output artifacts/training-smoke
npm test
npm run test:prompts
npm run lint
npm run build
```

`smoke_training.py` constructs tiny randomly initialized BERTs locally, trains both heads, saves and reloads checkpoints, and runs separate test evaluation. It proves the training code executes, not that a pretrained model was successfully adapted to real résumés. The optional HTTP/FAISS tests run when their dependencies are installed; the dependency-free suite explicitly skips them otherwise.
