# Local transformer model service

Sentence Transformers retrieves résumé passages, a cross-encoder reranks them, and DeBERTa assesses their relation to skill-experience hypotheses. Inference runs locally after model weights have downloaded. This service does not score people or make employment decisions.

## Start with Docker

From the repository root:

```sh
docker compose -f docker-compose.yml -f docker-compose.models.yml up --build
```

This starts the app, database, worker, Redis and model service. The first start downloads Python packages and model weights; allow several minutes and several GB of disk space. Subsequent starts reuse the `model_cache` volume. The service loads all configured models before reporting healthy. CPU is the default; latency depends on hardware. Docker Desktop must be running.

Ollama runs separately on the host. Pull `deepseek-r1:7b` to enable main LLM analysis and cited Q&A. Transformer classification itself does not require Ollama.

## Start with Python

Use Python 3.12. From the repository root, on Windows PowerShell:

```powershell
py -3.12 -m venv .venv
.venv/Scripts/python -m pip install -r services/model-service/requirements.txt
$env:HF_HOME = "$PWD/.model-cache"
$env:HF_HUB_DISABLE_TELEMETRY = "1"
.venv/Scripts/python -m uvicorn app:app --app-dir services/model-service --host 127.0.0.1 --port 8000 --workers 1 --no-access-log
```

On macOS/Linux, use `python3.12 -m venv .venv` and `.venv/bin/python` for the remaining commands; export `HF_HOME="$PWD/.model-cache"` and `HF_HUB_DISABLE_TELEMETRY=1` in the shell.

If Windows prevents Python from creating files in a protected or OneDrive directory, put the environment in a writable local directory (for example `$env:TEMP/resume-lab-model-env`) and use that environment's Python executable. The source can remain in the project.

In the Next.js root `.env.local`, add:

```dotenv
ENABLE_TRANSFORMER_ANALYSIS=true
MODEL_SERVICE_URL=http://127.0.0.1:8000
MODEL_SERVICE_TIMEOUT_MS=120000
```

Restart `npm run dev`. Analyze a résumé to see the transformer evidence panel and Q&A. Open `/evaluation` and select **Include transformers + reranking** to compare the three new variants. The evaluation checkbox explicitly requests the service even if advisory analysis is disabled.

Check readiness at `http://127.0.0.1:8000/health`. A running process is not ready until all models have loaded. Do not increase Uvicorn worker count without accounting for a full model copy per worker. Concurrent inference requests return 503 while the service is busy; the application discloses this and can be retried.

## Configuration

Set these in the model-service process environment, not the browser or Next.js `.env.local` (unless also exporting them into the Python process):

| Variable | Default / purpose |
| --- | --- |
| `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` |
| `RERANKER_MODEL` | `cross-encoder/ms-marco-MiniLM-L-6-v2` |
| `NLI_MODEL` | `MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli` |
| `MODEL_DEVICE` | `cpu`; use `cuda` only with a compatible PyTorch/CUDA installation |
| `NER_MODEL` | Empty: optional token-classification extractor disabled |
| `EVIDENCE_MODEL` | Empty: optional fine-tuned four-class evidence checkpoint disabled |
| `EVIDENCE_THRESHOLD` | `0.8`; abstain below maximum class probability (experimental, uncalibrated) |
| `RETRIEVAL_MODE` | `hybrid`; alternatives `dense`, `keyword` |
| `RETRIEVAL_BACKEND` | `numpy`; optional `faiss` after installing `requirements-faiss.txt` |
| `MODEL_SERVICE_TOKEN` | Optional bearer token; set the same value in Next.js/worker configuration |
| `HF_HOME` | Location of the downloaded model cache |
| `HF_HUB_OFFLINE` | Set to `1` after caching weights to prohibit Hub downloads |

Model IDs are administrator configuration, never accepted from user requests. Remote model code is disabled. NLI replacements must expose semantic `id2label` names for entailment, neutral and contradiction. Reports record resolved revisions when available; use a local immutable model snapshot for stricter reproducibility. Package ranges are compatibility bounds, not a locked environment; record resolved package versions with each experiment.

The standalone server binds to loopback. The Docker override publishes port 8000 only on loopback. For deployments crossing a trust boundary, configure a service token and a private network/TLS. No résumé content is written to disk by the inference code, and Uvicorn access logs are disabled by the supplied commands. Model downloads contact Hugging Face; inference does not send résumé text to the Hub.

## Optional BERT/DistilBERT entity extraction

Set `NER_MODEL` to a local or Hugging Face **fine-tuned token-classification checkpoint**, restart the service, and reanalyze. Exact entity spans and the checkpoint's label names appear in the transformer panel. A generic person/location/organization NER checkpoint does not extract résumé-specific skills, titles or qualifications. A base BERT checkpoint without a trained extraction head is not a working résumé extractor.

This repository now includes `train.py`, `evaluate_model.py`, and a training/reload smoke test for NER and four-class evidence classification. Follow the [training guide](../../docs/model-training.md). Supply independently annotated consented or fictional documents and split by source/template group. The bundled fixtures are not an adequate domain-training corpus. Do not train on the existing held-out examples and continue calling that split held out. Inference currently caps returned entities at 300, and tokenizers may truncate long passages; the training path rejects overlong sequences instead of losing labels silently.

## HTTP contract

- `GET /health`: loaded model names, revisions, package versions and decision settings.
- `POST /analyze`: `{requirements:[{skill}], passages:[{id,text}], includeBaseline, includeEntities}`. Returns `baseline`, `reranked`, `entities`, `metadata` and timing breakdowns. At most 40 requirements and 160 passages, each at most 800 characters. Invalid input returns 422; busy/failed inference returns 503.
- `POST /retrieve`: `{query, passages:[{id,text}], mode?, backend?, topK?, resultK?, rerank?}`. Defaults to hybrid candidate selection and three reranked passage IDs; returns retrieval timing/configuration and model metadata. FAISS indexes only this request's passages in memory.
- `POST /classify-evidence`: `{pairs:[{requirement,passage}]}`; up to 40 pairs. Requires `EVIDENCE_MODEL`; returns probabilities, verdicts and explicit abstention. `/analyze` also includes advisory `trainedEvidence` and `trainedEvidenceError` fields when configured.

No expected verdicts or training labels are sent to inference. Passage IDs refer only to the supplied request. Next.js reconstructs exact source offsets and rejects invalid IDs or entity spans.

## Tests

Dependency-free decision tests:

```sh
python -m unittest discover -s services/model-service -p 'test_*.py'
```

Application integration tests: `npm test`. These use controlled model responses to test behavior; they are not model-quality measurements. For a real-model comparison, first start the service, then run the commands in [the experiment guide](../../docs/transformer-experiments.md).

After installing the service dependencies, run `.venv/Scripts/python services/model-service/smoke.py` (or `.venv/bin/python` on macOS/Linux) to load the actual checkpoints and exercise readiness, classification, retrieval and input validation without leaving a server running. This downloads uncached weights. The one-example smoke result is an integration check, not an accuracy benchmark.

## Model references

- [Sentence Transformers retrieve and rerank](https://www.sbert.net/examples/sentence_transformer/applications/retrieve_rerank/README.html)
- [MiniLM sentence embeddings](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- [MS MARCO reranker](https://huggingface.co/cross-encoder/ms-marco-MiniLM-L-6-v2)
- [DeBERTa NLI model card](https://huggingface.co/MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli)
- [Hugging Face token classification](https://huggingface.co/docs/transformers/tasks/token_classification)
