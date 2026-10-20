# Local DeepSeek integration

The default generation model is `deepseek-r1:7b`, Ollama's Q4_K_M package of **DeepSeek-R1-Distill-Qwen-7B**. Ollama runs the model; it is not a competing model. The released checkpoint is based on Qwen and distilled by DeepSeek. This project integrates it for inference and does not claim to have trained or fine-tuned it.

Official references: [DeepSeek model card](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-7B), [Ollama package](https://ollama.com/library/deepseek-r1:7b), [thinking output contract](https://docs.ollama.com/capabilities/thinking). The package is about 4.7 GB. Free weights do not imply unlimited free hosted Hugging Face inference. This configuration runs locally and needs no paid API key.

## Run

Install Ollama, then run from the project directory:

```sh
# Terminal 1, unless Ollama is already running
npm run llm:serve

# Terminal 2
npm run llm:pull
npm run llm:check
npm run llm:smoke -- --output reports/deepseek-demo-repeat.json
npm run dev
```

The helper loads Next.js development environment files, including `.env.local`. `llm:check` verifies the configured model is installed and displays its digest and capabilities; it is not an inference quality test. `llm:smoke` calls the real analysis function on the public fictional walkthrough and validates the result through the production composition path. It exits 1 on unavailable/invalid output, 2 on unexpected demo verdicts, and 0 only when all four demo expectations match. A passing demonstration is not a general accuracy result. Interactive analysis can be cancelled; cancellation is propagated to local-model requests.

Set `OLLAMA_EXECUTABLE` for a portable installation and `OLLAMA_MODELS` to place weights outside OneDrive. The launcher binds to localhost, disables cloud features, and loads at most one LLM at a time. It does not install a system service or change system PATH. Stop it with Ctrl+C.

## What DeepSeek does

The application first extracts known requirements using the skill dictionary and aliases, supplies canonical keys, and assigns exact résumé passage IDs. DeepSeek selects from that contract; it may propose additional job requirements with exact job citations. It does not directly emit the final four-class verdict: the public policy maps its semantic category, and source/evidence checks may abstain.

1. Select résumé evidence passages and semantic categories for job requirements. A public fixed policy maps these categories to supported, partial, contradicted and unknown.
2. Propose criterion scores, explanations and neutral interview questions. The server validates source quotes and calculates the weighted total.
3. Generate an optional reviewer summary if the core analysis falls back.
4. Generate fictional demonstration profiles.
5. Answer evidence questions from retrieved passages when the separate Python transformer service is enabled.

The result badge names the actual model used. Invalid or unavailable core analysis is labeled as a deterministic fallback. Fine-tuned entity extraction, DeBERTa NLI and retrieval models remain separate from DeepSeek generation.

## Configuration and response integrity

The shared model default can be overridden with `OLLAMA_MODEL`; `OLLAMA_ANALYSIS_MODEL` and `OLLAMA_REVIEW_MODEL` override their respective roles. The initial local preset is an 8,192-token context, 4,096 generated-token budget including reasoning, and a 180-second timeout. These are bounded configuration defaults, not a guarantee of latency or GPU fit.

`OLLAMA_THINK=true` enables DeepSeek reasoning. Only the final `response` is parsed; a separate `thinking` field is never substituted for a missing answer. Embedded completed think blocks are removed, and unfinished reasoning or a token-limited response is rejected. All four generation paths derive their JSON Schema constraints from their Zod contracts, including the main analysis requirement for exactly four scoring criteria.

Q&A distinguishes retrieval failure, generation failure, invalid structured output and invalid citation. Abstention has no claims; answered responses need at least one. Every displayed Q&A quote must be an exact substring of the retrieved passage and the original source. Valid citations do **not** prove the model's interpretation is correct.

Interactive DeepSeek generation defaults to temperature 0.6. Comparisons now use that same model default unless `--temperature` is supplied; seed 42 and all generation settings are recorded. The first two DeepSeek diagnostics retained the older harness temperature of 0; those are preserved as a secondary configuration, not a direct measurement of the interactive preset. The official model card recommends 0.5–0.7. New reports also retain each parsed raw model draft, so missing canonical requirements can be distinguished from extraction/alignment errors.

## Reproduce a comparison

```sh
node --env-file=.env.local --import tsx scripts/compare.ts --split heldout --with-model --model deepseek-r1:7b --temperature 0.6 --output reports/diagnostic-deepseek-v8-repeat.json
npm run verify:reports -- reports/diagnostic-deepseek-v8-repeat.json
```

The CLI comparison uses the existing frozen dataset and does not retrain or change labels. Raw and verified LLM pipelines share the same generation for each example. Failed generations remain unavailable; rule fallbacks are counted separately. Do not compare partial coverage against complete runs or attribute fallback results to DeepSeek. Preserve poor results and failed runs alongside successful ones.

This 24-document set is fictional, agent-authored and provisionally labeled. It is useful for diagnostics, not evidence of hiring validity, fairness, or real-world recruitment performance. This set has already been retired as an untouched holdout; its errors informed the revisions.

## Recorded integration findings

The first real walkthrough produced the four expected evidence verdicts and passed source validation in approximately 108 seconds including first model load. This was one synthetic demonstration, not an accuracy benchmark. Its proposed criterion scores were generous: relevant skills 85/100 and measurable impact 65/100 despite only one demonstrated required skill and no quantified outcome. Do not equate successful parsing/citation checks with a justified score.

The initial 24-case comparison stopped model calls after two completed cases because the third generation omitted two required criteria. It is preserved as `reports/heldout-deepseek-initial.json`; its hybrid metrics include 22 rule fallbacks and must not be attributed to DeepSeek. The fix derives the generation schema from the same Zod validator, including exact array lengths. `npm run test:prompts` now checks that the request includes the four-criterion constraint.

The subsequent run is a diagnostic on the same previously inspected fictional set. No labels, semantic classification rules or analysis prompt were changed for this repair. Report it as a diagnostic rather than a fresh untouched holdout or generalization estimate. Performance timings were collected on a laptop during development and are not throughput estimates.
Historical first-pass results, including both temperatures and the since-fixed 17/24 naming limitation, are in [DeepSeek integration and diagnostics](../reports/deepseek-integration.md).

## Requirement identity and grounded generation

The current prompt is core-analysis-v7-enumerated-categories and the shared identity policy is canonical-wrapper-v2. Exact aliases and bounded skill-name wrappers are normalized in both displayed results and evaluation. Conflicting duplicate verdicts abstain. Job and resume quotes are checked verbatim against their respective sources.

The original heldout CLI split is now a previously inspected diagnostic set; its labels are unchanged. See [the full revision results](../reports/deepseek-revision.md) for replay versus live-inference results. To replay old saved drafts without inference, run:

node --import tsx scripts/replay-comparison.ts reports/diagnostic-deepseek-production.json reports/diagnostic-deepseek-v1-replayed.json

To repeat the current diagnostic, use a new output filename:

node --env-file=.env.local --import tsx scripts/compare.ts --split heldout --with-model --model deepseek-r1:7b --temperature 0.6 --output reports/diagnostic-deepseek-v8-repeat.json

The final contract uses skill-name keys and source-passage IDs. Required known skills cannot be omitted from valid output; the application reconstructs their exact names and quotations. Evidence selection and explanation precede the semantic category. The evidence-category-v1 policy maps categories to verdicts; missing required evidence abstains. Scoring criteria use fixed keys and exact passage references. Confidence uses explicit choices 0/0.25/0.5/0.75/1; criterion scores use explicit choices 0/10/20/30/40/50/60/70/80/90/100. These are uncalibrated model suggestions. A valid passage can still be irrelevant or misinterpreted. Model scores remain uncalibrated. Inputs are bounded to 12,000 job characters, 20,000 resume characters and 100 nonempty source chunks of at most 500 characters; long-document coverage is not established.


## V8 source-evidence checks and new challenge

Engine 3.2.0 retains the v7 prompt and evidence-category-v1 mapping. The evidence-eligibility-v1 checks apply only to the hybrid/displayed result, abstaining on recognizable ordinary-word senses, external ownership without applicant participation, and document instructions. The llm row preserves the original category-policy output. Check decisions retain the original verdict and reasons; the verifier reconstructs checked outputs as well as raw category-policy outputs. Aggregate scores are not recalibrated.

The separately frozen challenge contains 24 new agent-authored examples with provisional labels. It is available in the evaluation page and CLI:

```sh
node --env-file=.env.local --import tsx scripts/compare.ts --split challenge --with-model --output reports/challenge-deepseek-v8-repeat.json
npm run verify:reports -- reports/challenge-deepseek-v8-repeat.json
```

Do not describe this challenge as independently human-annotated or an unbiased population estimate. The same agent designed the checks and challenge; source/data hashes were frozen before model calls, and no tuning followed its live results. See [actual v8 measurements](../reports/deepseek-revision.md).

## Current results and deployment scope

On the new synthetic challenge (n=24), rules and DeepSeek categories + policy each score 15/24; adding evidence checks reaches 23/24 (95.8%) with four-class macro F1 0.9496. Development rules score 24/24 versus 22/24 for the checked model path. These observations do not establish general superiority over rules. See [progress and measured scope](progress.md).

Fully local inference is supported when model services are deployed locally. Remote model URLs, OCR endpoints and storage change the data boundary; consult [privacy and data handling](privacy.md). Error analysis uses evaluation-page categories, per-case reports and retained v1–v8 revision records rather than a separate Bad Case module.
