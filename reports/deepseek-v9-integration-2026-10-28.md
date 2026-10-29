# DeepSeek v9 integration rerun — 2026-10-28

Engine 3.3.0; DeepSeek-R1-Distill-Qwen-7B via Ollama deepseek-r1:7b, Q4_K_M. See the run manifest for model digest and source hashes. Prompt/category/checking policies unchanged from v8; this iteration adds checked-skills scoring, diagnostics and configured CLI execution. These are reused agent-authored synthetic sets, neither independent nor blind tests. Optional transformer pipelines were not run. Scores below evaluate four-state requirement judgments, not hiring validity or calibrated candidate scores.

| Set | Pipeline | Correct / judgments | Accuracy | Macro F1 | Model cases | Fallback cases | p50 / p95 seconds |
|---|---|---|---|---|---|---|---|
| Challenge | rules | 15/24 | 62.5% | 0.6665 | 0 | 0 | 0.00 / 0.00 |
| Challenge | llm | 16/24 | 66.7% | 0.6833 | 24 | 0 | 20.90 / 28.78 |
| Challenge | hybrid | 22/24 | 91.7% | 0.8889 | 24 | 0 | 20.90 / 28.78 |
| Development | rules | 24/24 | 100.0% | 1.0000 | 0 | 0 | 0.00 / 0.01 |
| Development | llm | 17/24 | 70.8% | 0.4857 | 10 | 0 | 21.81 / 27.81 |
| Development | hybrid | 18/24 | 75.0% | 0.5472 | 10 | 0 | 21.81 / 27.81 |
| Reused diagnostic | rules | 20/24 | 83.3% | 0.8314 | 0 | 0 | 0.00 / 0.00 |
| Reused diagnostic | llm | 20/24 | 83.3% | 0.8314 | 24 | 0 | 18.53 / 23.15 |
| Reused diagnostic | hybrid | 23/24 | 95.8% | 0.9580 | 24 | 0 | 18.54 / 23.15 |

Report hashes:

- deepseek-v9-challenge-verified-2026-10-28.json SHA256 039fd374d1485e63ad176da327efe35ab418186a60df4fe3cf506c7262eb8fa9
- deepseek-v9-development-2026-10-28.json SHA256 9a15b972d83de3604ec7b8123faa17d0859bf432fc18c93616a2b3c971487309
- deepseek-v9-diagnostic-2026-10-28.json SHA256 b43c6abd88eb28f0a5a3e227b4e484c1beb10e8d4c5bf5ffd99a189ad6089b91

## Remaining checked-judgment mismatches

- Challenge / fresh-17 / docker: expected partial, observed supported. [evidence-category-v1: applicant_used_skill] Completed beginner Docker lessons and container exercises in a supervised classroom lab.
- Challenge / fresh-20 / react: expected partial, observed supported. [evidence-category-v1: applicant_used_skill] Applicant followed introductory React tutorials to understand components and state.
- Development / adversarial-1 / react: expected supported, observed contradicted. [evidence-category-v1: applicant_explicitly_denies_skill] Direct mention of React as a skill used.
- Development / adversarial-3 / react: expected contradicted, observed unknown. [evidence-category-v1: applicant_explicitly_denies_skill] applicant_explicitly_denies_skill No source selected; abstained.
- Development / adversarial-3 / docker: expected contradicted, observed unknown. [evidence-category-v1: applicant_explicitly_denies_skill] applicant_explicitly_denies_skill No source selected; abstained.
- Development / adversarial-5 / go: expected unknown, observed partial. [evidence-category-v1: applicant_learning_skill] The candidate mentions 'Go' but does not explicitly demonstrate professional use, so it's considered applicant_learning_skill.
- Development / adversarial-6 / github actions: expected supported, observed unknown. [evidence-category-v1: missing_or_ambiguous] No direct mention of GitHub Actions in the resume.
- Development / adversarial-9 / pytorch: expected supported, observed partial. [evidence-category-v1: applicant_learning_skill] Applicant explicitly demonstrated experience with PyTorch in the context of machine learning models.
- Reused diagnostic / holdout-10 / react: expected partial, observed supported. [evidence-category-v1: applicant_used_skill] Applicant used React in a beginner tutorial.

## Execution and interpretation

The first two v9 challenge attempts are retained as failed integration runs: the diagnostics instrumentation lacked a stage initialization. The CLI also initially omitted local environment loading. Neither failed attempt is model-accuracy evidence. The verified reports above were generated after both fixes. Latency is observed local runtime, including early concurrent build/browser work, not a controlled performance benchmark. Historical v8 reports remain unchanged.

Validation: 138 unit tests, 15 browser tests (two workers), lint and production build passed. Initial sandbox junction failures and two eight-worker browser timeouts were retained in local logs; the later status-selector ambiguity was fixed with named status regions.

Independent evaluation preparation includes a blinded packet, SHA-256 integrity check, strict label schema, complete-key and duplicate checks, plus a human adjudication guide. No independent human labels were collected.

## Guided example and interpretation

The live guided example scored 4/4; see [saved guided output](deepseek-v9-guided-2026-10-28.json). All 58 benchmark documents plus the guided example completed with local model inference and no fallback. There are 9 checked mismatches across 72 benchmark judgments.

Compared with archived v8: challenge 23/24 → 22/24, development 22/24 → 18/24, diagnostic unchanged at 23/24. Dataset hashes and recorded generation settings match v8 (seed 42, temperature 0.6, context 8192, output budget 4096). This run does not establish the cause of output variation. The scoring change recomputes skills points, not requirement verdicts. Do not claim an accuracy improvement from these engineering changes.
