# Continuation completed — 2026-10-29

All checkpoint steps are complete. See [v11 results](../reports/deepseek-v11-results.md) for measured outcomes and remaining errors. The content below preserves the historical pause snapshot; it is not a pending task list. No work is scheduled and nothing was pushed.

# Historical pause snapshot — resumed on 2026-10-29

The user has resumed this work. The instructions below record the pause state; see project progress for current status.

# V11 checkpoint — paused by user, 2026-10-29

Work is paused. Do not resume inference, start scheduled work, commit or push until the user asks to continue. The daily automation was previously removed and remains off.

## Completed measurements

- Original inspected set: fresh engine 3.5.2 run **48/48**, raw DeepSeek **36/48**, rules **26/48**. All 11 original mismatches fixed in that run. 24 model calls, zero fallback. Artifact: `reports/v11-inspected-verified-results.json`.
- New transfer set B: first-use engine 3.5.2 run **27/32 (84.375%)**, macro F1 **0.8461152882**; raw **23/32**, rules **17/32**. 16 model calls, zero fallback. Artifact: `reports/v11-new-verified-results.json`. Preserve this first-use result unchanged.
- Guided example: fresh engine 3.5.2 **4/4**, `reports/v11-guided-verified-results.json`.
- Intermediate inspected runs are preserved: 3.5.0 **40/48** and 3.5.1 **47/48**. Their files are `v11-inspected-results.json` and `v11-inspected-final-results.json`.
- User confirmed five original boundary labels after viewing predictions; `reports/v11-label-review.json`. Labels were not changed. This is not independent blind annotation.

## Latest code and validation

Current code is engine **3.5.3**, prompt **core-analysis-v11-scope-multilingual**, checks **evidence-boundaries-v6**. The latest change prevents a valid supported quote from being replaced by an older denial through unnecessary source-line expansion. Boundary/contradicted/learning fragments can still use bounded source context. Unknown model judgments remain unknown.

**184 unit tests, lint and production build including TypeScript passed for 3.5.3.** The build finished before this pause was recorded. The last browser run passed 15 tests on 3.5.2; rerun it on 3.5.3. No 3.5.3 replay or live model evaluation has run yet. Do not claim its expected scores as measured results.

No evaluation process remains active. Ollama was started locally with the already installed model and is idle; check readiness on resume rather than downloading anything. No new inference is scheduled.

## Five B mismatches from its first pass

1. transfer-b03 / Java: supported → contradicted. Raw model was correct; context expansion imported the dated denial. The 3.5.3 code change addresses this, but replay/live confirmation remain pending.
2. transfer-b07 / Tailwind: unknown → contradicted. Differently worded blank form (“add your example”).
3. transfer-b08 / Python: unknown → contradicted. Chinese quoted job advert/non-claim, alongside a separate TypeScript denial.
4. transfer-b09 / Azure: contradicted → unknown. Model omitted the citation; system correctly abstained rather than inventing evidence, but disagreed with the reference label.
5. transfer-b11 / Go: unknown → contradicted. Ordinary English word, explicitly not a software skill.

The last four are new raw-model errors. Preserve and report them rather than silently relabeling or describing the inspected B set as untouched. Current plan is to verify the check-induced regression repair and measure fresh controls, not claim every possible judgment error is eliminated.

## Resume steps

1. Read this checkpoint and inspect the working tree. Preserve the many pre-existing UI/refinement edits. Verify engine/prompt/check versions above.
2. Run the final browser suite: set `PLAYWRIGHT_PORT=3101`, then `npx playwright test --workers=1`. The build rewrote `next-env.d.ts` to production paths; the dev server normally restores `.next/dev/types` imports.
3. Replay through final v6 checks, each to a NEW artifact using `npx tsx scripts/recheck-evidence.ts INPUT OUTPUT`:
   - `reports/v11-inspected-verified-results.json` → `reports/v11-inspected-v6-replay.json`
   - `reports/v11-new-verified-results.json` → `reports/v11-new-v6-replay.json`
   - `reports/deepseek-v10-development-final.json` → `reports/v11-development-v6-replay.json`
   - `reports/deepseek-v10-challenge-final.json` → `reports/v11-challenge-v6-replay.json`
   - `reports/deepseek-v10-diagnostic-final.json` → `reports/v11-diagnostic-v6-replay.json`
   These are ZERO new model calls. Inspect actual results and any regressions.
4. `npm run llm:check`; start the configured local service only if needed. Use installed DeepSeek-R1-Distill-Qwen-7B (`deepseek-r1:7b`); no downloads or endpoint changes.
5. Record runtime: `npx tsx scripts/record-evaluation-runtime.ts reports/v11-runtime-v6.json`.
6. The following 3.5.3 inputs are ALREADY frozen with current production-source hashes. Do not re-author or overwrite them. Run `npx tsx scripts/evaluate-frozen.ts INPUT OUTPUT` sequentially:
   - `reports/v11-new-controls-v6-frozen.json` → `reports/v11-new-controls-v6-results.json` (8 new fictional documents, 16 judgments, four/class; targeted controls, not independent)
   - `reports/v11-temporal-confirmation-frozen.json` → `reports/v11-temporal-confirmation-results.json` (2 inspected documents, 4 judgments)
   - `reports/v11-guided-v6-frozen.json` → `reports/v11-guided-v6-results.json` (1 public demo, 4 judgments)
   Total pending: 11 model calls, roughly 6–9 minutes at observed speed. Do not modify frozen engine sources during runs. Preserve any failures. No tuning after viewing fresh control C results.
7. Verify completed reports using `scripts/verify-reports.ts`, save JSON as `reports/v11-verification.json`; include the five v6 replays, three final live reports, and first-pass A/B reports. Record post-run runtime separately. Verify zero fallback versus incomplete coverage explicitly.
8. Write the final results report and synchronize README, progress, portfolio, report index, architecture/evidence policy, refinement plan and review guide. Clearly distinguish B first-use 27/32 from any corrected replay score. Do not combine the sets into one generalization headline.
9. Update the two local-only Chinese career notes and their local mirrors; keep them ignored and never link them from public docs or publish them. Preserve historical text/results.
10. Check local Markdown links, current versions, actual counts, privacy exclusions and whitespace. No commit/push. Report all remaining B/C errors and distinguish fresh calls from replay.

## Prepared helpers (outside the repository)

Workspace: local agent workspace (machine-specific path omitted).

- `work/report-v11-complete.cjs` is the latest ONE-TIME report/docs helper. Inspect its assertions and artifact paths before running AFTER all expected reports exist. It has not run. Verify actual results and wording afterward; do not blindly rerun (it prepends/appends sections).
- Older `work/report-v11.cjs`, `prepare-v11.cjs`, `freeze-v11-final.cjs`, `freeze-v11-verified.cjs`, `apply-v11-context.cjs`, `apply-v11-nonclaims.cjs`, and `close-v11-regression.cjs` are already applied or obsolete; DO NOT rerun them. `close-v11-regression.cjs` created the final frozen control inputs and appended two tests.
- `outputs/v11-in-progress-checkpoint.txt` is older; this checkpoint supersedes it.

The final report `reports/deepseek-v11-results.md` and final documentation synchronization are NOT complete. Technical evidence docs still say 3.5.2/v5 and need updating to 3.5.3/v6 after final verification.