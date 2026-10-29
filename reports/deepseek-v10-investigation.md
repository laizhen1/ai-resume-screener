# v10 investigation: observed v9 accuracy drop

This investigation compares saved v8 and v9 generations and replays them through the pre-v10 composer. See `deepseek-v10-investigation.json` for per-judgment differences.

## Confirmed findings

- All three dataset hashes and recorded generation configurations match. The guided-v8 and v9 runtime records contain the same model digest, `755ced02ce7befdb13b7ca74e1e4d08cddba4986afdb63a480f2c93d3140383f` (DeepSeek-R1-Distill-Qwen-7B, Q4_K_M).
- Replaying the saved v8 and v9 drafts through engine 3.3.0 changes zero saved checked verdicts. The checked-skills score change is not responsible for the requirement-judgment accuracy drop.
- Raw verdicts differ on 7 development, 2 diagnostic and 3 challenge judgments. Some changes improve and others worsen results.
- The nine v9 checked errors consist of three coursework/use confusions, two missing denial citations, two category/explanation contradictions, one missed alias, and one unrelated selected passage.
- One-line passages can contain multiple sentences about different skills, allowing delivery evidence for one skill to be carried to coursework for another. The first v10 pilot reproduced this on SQL delivery followed by Python coursework.

## Limits of causal attribution

The old records lack exact request hashes and Ollama/backend versions. Matching model digest, seed and exposed configuration does not establish identical full requests or execution conditions. The raw output changes are observed; their lower-level runtime cause is not established. The new runtime manifest and per-request prompt/schema hashes improve future comparison. We do not claim that v10 is deterministic or that one improved run proves stability.

## Changes under test

1. Alias-aware evidence guides supply candidate excerpts per requirement, without labels or rule verdicts. Ordinary-word matches remain candidates so the model and existing checks can judge them.
2. Exact sentence-scoped passages prevent adjacent delivery and learning statements from becoming a single cited span. Source substrings remain verbatim.
3. Prompt distinctions address actual study versus future plans, beginner exercises versus delivery, and machine-learning engineering versus attending training. Strong direct evidence takes precedence over a bare list.
4. Prompt/schema hashes, model response metadata, Ollama version, source hashes and the installed model digest are recorded.

No expected labels enter production inference. The category mapping and conservative evidence-check policy have not been changed. The 16 new controls are agent-authored and frozen before control inference, not independently labeled or a blind generalization benchmark. All pilots and failures are retained; final results are reported separately.

## Subsequent v2 correction stage

The initial prompt-only run exposed lost context from sentence splitting, introductory coursework overclaiming and denial-plus-learning confusion. The final composer adds bounded exact-source-line restoration, instruction-scope preservation, and explicit coursework/denial constraints with original-verdict audits. These are deterministic hybrid checks. The paired recheck and fresh controls are detailed in deepseek-v10-results.md.
