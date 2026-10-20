# DeepSeek integration and diagnostic results

Historical first integration pass. The naming mismatch described here was subsequently fixed; see [the later revision report](deepseek-revision.md) for corrected baselines and current measurements.

Verified locally on 2026-10-20. This pass adds a working local DeepSeek runtime, a guided fictional demonstration, cancelable analysis, shared structured-output contracts, stricter Q&A source validation, and saved-report verification. It does not establish an accuracy improvement or train a model.

## Runtime and reproduction

- Model: `deepseek-r1:7b`, Ollama's Q4_K_M package of DeepSeek-R1-Distill-Qwen-7B (7.6B parameters).
- Model digest: `755ced02ce7befdb13b7ca74e1e4d08cddba4986afdb63a480f2c93d3140383f`.
- Ollama: 0.40.6, Windows amd64. Official portable archive SHA-256: `e359637575302f288d76c0007c408a4be9c7376d59c4f28684d63b232a44b427`.
- Host GPU: NVIDIA GeForce RTX 3060 Laptop GPU, 6 GiB VRAM; partial GPU offload. Localhost inference, no hosted inference API.
- Interactive preset: temperature 0.6, seed 42, reasoning enabled, context 8,192 tokens, output budget 4,096 tokens, timeout 180 seconds.
- The model cache is outside OneDrive. The model weights are free to download; this does not mean unlimited free hosted Hugging Face inference. No DeepSeek training or fine-tuning was performed.

See [setup and reproduction](../docs/deepseek.md). Official sources: [DeepSeek model card](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-7B), [Ollama package](https://ollama.com/library/deepseek-r1:7b), [thinking response contract](https://docs.ollama.com/capabilities/thinking).

## Real inference, including failures

The [public walkthrough](deepseek-demo.json) returned all four intended evidence verdicts: Python supported, Docker partial, Kubernetes contradicted, and Terraform unknown. It took about 108 seconds including initial loading. This one demonstration verifies integration, not general accuracy. Its proposed skill and impact scores were generous relative to the evidence and remain uncalibrated suggestions.

The [initial comparison](heldout-deepseek-initial.json) completed only two model cases. The third response supplied two scoring criteria although validation required four. The hand-written generation schema omitted that array-length constraint. Generation now derives JSON Schema from the same Zod contract used for validation, and the prompt fixture checks `minItems = maxItems = 4`. The partial report is preserved: its hybrid path contains 22 rule fallbacks and must not be described as DeepSeek performance.

Two complete diagnostics followed the schema repair. Both use the same 24 fictional documents with one provisional labeled requirement each. The first retained the old harness temperature 0; the second uses the already configured interactive preset of 0.6. No labels, classification policy or semantic analysis prompt were changed between them. These are previously inspected diagnostic examples, not a new independent holdout.

| Setting / pipeline | Model cases | Rule fallbacks | Correct under existing alignment protocol | Macro F1 |
|---|---:|---:|---:|---:|
| Rules baseline | 0 | 0 | 20/24 (83.3%) | 0.8314 |
| Temperature 0 / raw LLM | 24 | 0 | 8/24 (33.3%) | 0.2787 |
| Temperature 0 / citation-checked hybrid | 24 | 0 | 6/24 (25.0%) | 0.1607 |
| Temperature 0.6 / raw LLM | 24 | 0 | 9/24 (37.5%) | 0.3120 |
| Temperature 0.6 / citation-checked hybrid | 24 | 0 | 10/24 (41.7%) | 0.3414 |

Artifacts: [temperature 0](diagnostic-deepseek.json), [interactive temperature 0.6 including raw drafts](diagnostic-deepseek-production.json). The file name `production` denotes the interactive generation preset, not a production deployment or dataset.

### What these scores mean

The existing evaluator matches emitted skill names against an exact canonical name or known alias (case-insensitive). Unmatched requirements become `unknown`; an expected `unknown` can therefore count as correct even when matching fails. This is an end-to-end score under that protocol, not isolated semantic classification accuracy.

The temperature-0.6 run failed canonical alignment on **17/24** requirements. Saved drafts show outputs such as `Python experience` for the expected key `python`, even though the model did extract a Python requirement. The report field `missing` therefore means no exact canonical match; its legacy reason text saying the requirement was not extracted can be misleading. Do not interpret all 17 cases as omitted extraction. This limitation affects both raw and citation-checked metrics and limits comparison with a rules engine that emits canonical names by construction. No retrospective remapping or favorable replacement score is presented here.

There are also substantive errors independent of naming: holdout-10 labels React tutorial learning as supported, and holdout-14's raw draft labels Java as supported despite explicit negation. Holdout-01 quotes the job requirement as résumé evidence. Holdout-20 emits conflicting duplicate React judgments. These saved drafts support targeted future fixes rather than a claim that changing the model automatically improves quality.

At temperature 0.6, invalid citations among aligned, non-unknown predictions were 1/6 in raw output and 0/5 after validation. Lower invalid-citation rate does not establish correct interpretation; missing alignments and abstentions are excluded from that denominator. Raw latency was p50 26.4 seconds and p95 33.0 seconds. At temperature 0, those values were 28.4 and 44.8 seconds. These single laptop runs occurred during development and are not throughput estimates or a controlled speed comparison.

## Engineering validation

- 59 TypeScript tests passed across 13 test files.
- 7 Playwright browser tests passed, covering the guided demo, stale-result clearing, input/file handling, cancellation and existing workspace/evaluation paths. Browser tests use deterministic fixtures, not a model-quality oracle.
- Python service suite: 17 passed, 1 optional FAISS parity test skipped.
- 2 prompt HTTP-fixture checks passed, including the generated four-criterion schema contract. These are not live-model quality measurements.
- ESLint and the final Next.js production build passed.
- Four historical reports and all three new diagnostic reports passed internal-consistency verification: coverage, dataset hash, citation flags and recalculated metrics. This is not independent label review or proof that a saved report is authentic.
- Desktop and mobile walkthrough screenshots were inspected; they show the explicitly labeled offline fixture mode.

The tests validate implementation behavior within their scope. Docker deployment, a new transformer comparison, domain-model fine-tuning and real recruitment effectiveness were not tested in this pass.

## Portfolio conclusion and next experiment

The defensible project achievement is a functioning local LLM evidence-review workbench with explicit failure handling and reproducible diagnostics. The new model did not demonstrate an end-to-end accuracy gain under the current protocol. Schema integrity, citation validity, naming alignment, semantic correctness and score calibration must be evaluated separately.

For the next iteration, constrain or normalize requirement identifiers consistently for both runtime and evaluation, handle conflicting duplicate requirements, and add score-rubric calibration. Develop these changes on a development split. Obtain independently reviewed, family-disjoint test examples before reporting a fresh accuracy improvement. The current 24-case set is retired as an untouched holdout for those changes.

See [Chinese STAR résumé wording](../docs/STAR-resume-zh.txt) and [portfolio scope](../docs/portfolio.md).
