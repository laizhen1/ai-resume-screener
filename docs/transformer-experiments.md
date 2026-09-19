# Transformer evidence experiments

## Implemented pipeline

1. Extract job skills using the same versioned taxonomy and contextual rules used by the baseline. This is skill-evidence classification, not complete logical verification of all job requirements (for example years of experience).
2. Split original résumé text into exact spans of at most 600 JavaScript characters, respecting line boundaries and word boundaries where possible. Search the first 160 passages. The analyzer displays a warning when the document is longer.
3. Embed `Experience with {skill}` and each passage using Sentence Transformers. Retrieve the top eight by cosine similarity.
4. The dense variant selects the top three directly. The reranked variant scores the eight candidates with a cross-encoder and selects three. The cross-encoder ranks relevance, not evidence truth or applicant suitability.
5. DeBERTa performs NLI twice for each selected passage: `The applicant has experience with {skill}.` and `The applicant is learning or has limited exposure to {skill}.`
6. A label is decisive only when its softmax probability is at least 0.80 and exceeds the runner-up by at least 0.15. These are initial experimental settings, not calibrated probabilities. Tune only on development data.
7. Delivery entailment produces supported; learning entailment without delivery entailment produces partial; delivery contradiction without learning entailment produces contradicted. Otherwise return unknown. Opposing supported and contradicted passages force unknown. This mapping is an explicit heuristic over two three-class NLI calls, not a fine-tuned four-class résumé classifier.
8. Reconstruct all citations against the original source. The main analyzer displays these independent judgments without changing its score or existing assessments.

## Comparison variants

The evaluation UI, streaming API and `scripts/compare.ts` support six pipelines:

| ID | Pipeline |
| --- | --- |
| `rules` | Existing deterministic baseline |
| `llm` | Raw Ollama judgments |
| `hybrid` | Ollama judgments with source validation |
| `dense-nli` | Sentence Transformers retrieval + DeBERTa |
| `reranked-nli` | Sentence Transformers + cross-encoder + DeBERTa |
| `rules-transformer` | Reranked NLI combined with rules |

The last variant preserves rule-detected partial and contradicted verdicts. An unknown transformer verdict keeps the rule verdict; a supported rule judgment conflicting with a resolved transformer verdict becomes unknown. Other resolved transformer judgments may fill unknown rules. This policy is evaluated as its own pipeline and is not applied to the application's main score.

## Run and reproduce

Start the [model service](../services/model-service/README.md). With the default loopback URL no environment file is needed for the comparison CLI:

```sh
npm run compare -- --split development --with-transformers --output reports/development-transformers.json
npm run compare -- --split heldout --with-transformers --output reports/heldout-transformers.json
# Add the existing Ollama pair once that model is running:
npm run compare -- --split heldout --with-transformers --with-model --model qwen3:4b --output reports/all-models.json
```

For a nondefault service URL or token, export `MODEL_SERVICE_URL` and `MODEL_SERVICE_TOKEN` in the CLI shell; the standalone `tsx` script does not load `.env.local`. Next.js does. A comparison explicitly selects transformer models with the flag or UI checkbox; `ENABLE_TRANSFORMER_ANALYSIS` controls only the main application's advisory panel and Q&A.

Exit codes: 0 for a completed requested run; 1 for errors or a failed development rules gate; 2 when a requested model comparison is incomplete. Disabled pipelines remain `not-run` and do not cause an incomplete-run exit. Transformer failure stops further transformer requests in that run; all affected variants show unavailable with zero evaluated predictions, not synthetic model performance.

Each completed transformer case stores checkpoint IDs, resolved revisions when available, package versions, device, thresholds, selected passages and raw NLI/reranking scores. Reports keep the existing `comparison-v1` envelope with additive optional fields, so older saved reports remain readable. The database stores report JSON and needs no additional migration beyond the existing report migration.

## Metrics and timing

Existing confusion matrices, macro F1, support precision/recall, false-support rate, citation validity, abstention and latency metrics work across the new variants. Compare quality only at equal evaluated coverage. Review false support and the partial/unknown confusion as well as aggregate accuracy.

Transformer timings include rules/requirement extraction plus measured embedding retrieval and the relevant NLI path. Reranked timings additionally include the cross-encoder; rules-transformer includes combination time. The dense and reranked variants execute separate NLI calls with the same passage budget. Service timing excludes network/JSON transport, model startup and optional NER. Ollama latency uses a request-level boundary, so the two timing methods are not directly comparable. Models are loaded once before service readiness; device kernels may still warm up during the first inference.

The existing provisional development and held-out documents and their hashes remain unchanged. Integration tests use mocked outputs and do not establish actual model quality. A separate [actual-model development report](../reports/development-transformers.json) records 11/24 correct judgments for dense NLI, 10/24 for reranked NLI and 24/24 for rules + transformers. The hybrid matches the development rules baseline. A subsequent [held-out run](../reports/heldout-transformers.json) using unchanged settings records 12/24 for each pure NLI variant and 21/24 for the hybrid versus 20/24 for rules. That one-case difference does not establish general improvement. No résumé-domain validity is claimed. The known old held-out errors must not become tuning examples without retiring that split.

## Cited Q&A

The analyzer and workspace expose question answering when transformer review is enabled. The service retrieves/reranks up to three passages; the existing local Ollama model generates structured claims with exact quotes. Next.js rejects an answer if any quote is absent from its cited retrieved passage. The UI distinguishes answered, abstained and unavailable outcomes. Citation presence checks provenance, not whether a generated claim is logically supported.

Stored candidate questions use authenticated repository access. Public-demo questions accept a résumé upload or text and are rate-limited. Questions and answers are not persisted by this feature. No automatic reviewer-feedback training is performed.
