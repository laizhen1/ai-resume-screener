# Project progress

## Latest v13 evaluation

Engine **3.7.1** fresh DeepSeek rerun: inspected examples **32/32**, new synthetic controls **16/16**, guided **4/4**. **4/4** prior mismatches now match their labels. New-control four-class macro F1 **1.0000**; raw model **12/16**. New controls were frozen before inference but use familiar failure mechanisms and agent-authored labels; they are not independent or family-disjoint evaluation. [Full results](../reports/deepseek-v13-results.md).


## Historical first-use evaluation v2

On 16 first-use synthetic documents (32 judgments), unchanged engine **3.6.0** scored **28/32 (87.5%)**, four-class macro F1 **0.8576** after checks; raw DeepSeek scored **27/32**. There were **4 checked mismatches**. Documents and provisional agent labels were frozen before this single-pass run. These are new examples of partly familiar mechanisms, not independently annotated or family-disjoint evaluation. [Full results and errors](../reports/novel-generalization-v2.md).


## Historical v12 evaluation

Engine **3.6.0** fresh rerun: transfer **32/32**, controls **16/16**, temporal confirmation **4/4**, guided example **4/4**. **6/6** previously remaining case/skill errors now match their labels. These are reused, inspected synthetic regression sets; raw/checked results, any new errors and separate zero-call replays are recorded in the [v12 report](../reports/deepseek-v12-results.md). No independent generalization claim is made.


## Historical v11 evaluation

Engine **3.5.3** fixes **11/11 original mismatches**. Inspected set A: **48/48** on fresh v11 inference, unchanged in the final-check replay (previously 37/48). New transfer set B: **27/32** on first use; its check-induced temporal regression was repaired, yielding **28/32** in a clearly labeled saved-output replay. Fresh post-fix controls C: **15/16**, four-class macro F1 **0.9365**; temporal confirmations **3/4**, guided example **4/4**. These are agent-authored synthetic measurements, not independent or family-disjoint evaluation. [Full results, remaining errors and execution distinctions](../reports/deepseek-v11-results.md).


## Historical V11 pause checkpoint — 2026-10-29

This snapshot was saved at the user's request and superseded when they resumed. Fresh engine 3.5.2 results: inspected **48/48** (all 11 original mismatches fixed), new transfer set **27/32**, guided **4/4**. The new set exposed one check-induced regression and four raw-model errors. Engine **3.5.3** repairs the regression and passes **184 unit tests, lint and production build**; its final browser/replay/live-control verification and documentation sync were pending at that checkpoint and are now complete (see latest results above). See the [resume checkpoint](checkpoint-2026-10-29-v11.md). The user subsequently resumed this task; the daily follow-up remains off.


## Historical first new-example evaluation

On 24 newly authored fictional documents (48 judgments, 12 per class), the unchanged engine 3.4.1 checked pipeline scored **37/48 (77.1%)**, four-class macro F1 **0.7632**. Raw DeepSeek scored **35/48**. This was a fresh, single-pass inference run with labels and engine hashes frozen beforehand; it was not replay or independent human annotation. [Full results and errors](../reports/novel-generalization-v1.md).

## Historical v10 regression results

V10 live generations with paired v2 source checks (no new calls for the three-set recheck): development **24/24**, challenge **24/24**, reused diagnostic **24/24**; **0 mismatches across 72 judgments**. Guided example **4/4**. New frozen agent-authored controls **16/16**, unavailable 0. These are synthetic regression measurements, not independent or blind evaluation. [Full results](../reports/deepseek-v10-results.md).

## Historical v9 integration — 2026-10-28

Fresh v9 rerun (2026-10-28): checked DeepSeek 22/24 challenge (91.7%, four-class macro F1 0.8889), 18/24 development, 23/24 reused diagnostic. Challenge rules 15/24; raw model 16/24. Total checked mismatches: 9/72. All are reused, agent-labeled synthetic sets, not independent tests. See [v9 report](../reports/deepseek-v9-integration-2026-10-28.md) for paired outputs, latency, hashes and failures. Application checks: 138 unit tests, 15 browser tests, lint and production build passed.

Status reviewed: **2026-10-29**. Current engine: **3.7.1**, scoring policy **checked-skills-v1**. Model diagnostics, source review and independent-review preparation are implemented. The v10 model runs, paired v2 checks and fresh controls are recorded separately from the historical v8/v9 baselines below.

Current v13 validation: **214 unit tests, 15 browser tests, lint and production build (including TypeScript) passed**. Report consistency checks passed. Five inspected boundaries were confirmed by the user after viewing outputs; independent blind annotation remains outstanding.

## Implemented

- Guided Studio: Define role → Add résumé → Review evidence; input-preserving step navigation, file drop/replacement/removal and validation, generated examples, cancellation, source-snapshot protection and keyboard focus management. Shared responsive shell across analyzer, workspace, evaluation, regression and sign-in, with an SVG logo/favicon.

- Multi-format résumé ingestion, image OCR, job workspaces, batches, comparison and human review; optional PostgreSQL/pgvector storage and Redis background work.
- Local **DeepSeek-R1-Distill-Qwen-7B** via Ollama (`deepseek-r1:7b`). Dictionary/alias-based extraction supplies known requirement keys; the model selects source passages and evidence categories and may propose source-cited additional requirements.
- Fixed category-to-verdict mapping, source/identity validation and bounded eligibility checks. Original responses and check decisions remain inspectable. The skills score is recomputed from checked verdicts; the other three criteria remain uncalibrated model suggestions.
- Optional Python retrieval/evidence service: BM25 + vectors + RRF, cross-encoder reranking, NLI evidence analysis and cited Q&A. These optional components are not the source of the v8 DeepSeek score.
- Six comparison pipelines, review feedback, exportable per-case reports and v1–v8 revision records with failed results retained. Error attribution is supported by the evaluation page and report tables, not a separate Bad Case module.
- Public documentation records baseline comparisons, dataset provenance and conditional local-processing claims. Personal resume and interview documents are excluded from version control.

## Historical v8 measured results

| Dataset | Rules | DeepSeek categories + policy | With evidence checks | Checked four-class macro F1 |
| --- | ---: | ---: | ---: | ---: |
| Development | 24/24 | 21/24 | 22/24 | 0.9321 |
| Reused diagnostic | 20/24 | 20/24 | 23/24 | 0.9580 |
| New synthetic challenge | 15/24 | 15/24 | 23/24 | 0.9496 |

Development has 10 documents and 24 requirement judgments; each other set has 24 documents and one judgment per document. The two DeepSeek variants share one generation per document. The challenge rules and labels were authored by the same agent: it is synthetic, provisionally labeled, not independently annotated or blind. Its 23/24 (95.8%) and four-class macro F1 0.9496 are application-pipeline measurements, not proof of generalization or hiring validity.

The guided example is **4/4**. The 58 development/diagnostic/challenge documents completed real model inference with no rule fallback. The original four diagnostic cases now match their labels; saved v7-output replay reaches 24/24 with zero new model calls, while the fresh diagnostic is 23/24. Keep replay and live results separate.

Source: [v8 detailed report](../reports/deepseek-revision.md), [all measured results](../reports/README.md), [development JSON](../reports/development-deepseek-v8.json), [diagnostic JSON](../reports/diagnostic-deepseek-v8.json), [challenge JSON](../reports/challenge-deepseek-v8.json).

## Last completed code validation — 2026-10-26

- 109 TypeScript tests across 16 files.
- 12 Playwright browser tests. The four added scenarios cover step gating/back navigation, invalid and removable uploads, generation/input locking, and navigation at 320px. Existing evidence, cancellation, workspace, transformer Q&A and experiment export checks also pass. The first redesign run caught initial focus moving unexpectedly under React Strict Mode; step-change tracking fixed it, and the full suite passed.
- ESLint and production build passed.
- Production preview checked across 12 desktop/mobile views: no page errors or horizontal overflow; SVG favicon returns HTTP 200.
- Previously, 23 saved comparison reports passed internal-consistency verification; this historical check was not rerun for the UI redesign. This verifies recorded predictions/metrics, not independent label quality.
- Optional transformer/training, Docker deployment, real recruitment outcomes and fairness evaluation were not rerun or established by v8.

## Historical v8 mismatches

| Dataset/case | Requirement | Expected | Observed after checks |
| --- | --- | --- | --- |
| Development / adversarial-1 | TypeScript | supported | partial |
| Development / adversarial-1 | React | supported | partial |
| Diagnostic / holdout-24 | Terraform | unknown (future learning intention) | supported |
| Challenge / fresh-17 | Docker | partial (beginner coursework) | supported |

These are four mismatches across 72 judgments, not four errors within either 23/24 set. Rules remain the stronger development baseline. The model path contributes evidence selection and explanation; broad generalization is still a goal to evaluate.

## Next work, not completed

1. Independently review label boundaries for skill lists, learning and future intentions, then create a new family-disjoint test set before further tuning.
2. Address the remaining judgment errors with positive controls and report paired before/after results without overwriting current artifacts.
3. Checked-skills consistency is implemented in engine 3.3.0; broader score calibration remains unestablished.
4. Broaden document-format, multilingual and attribution coverage, then separately assess deployment/performance needs.
5. An authenticated, read-only project MCP server remains planned, not implemented.

## Documentation and privacy scope

The README, architecture, evidence policy, scoring, dataset card, privacy and report index now describe the same current pipeline. Fully local inference is supported when model, OCR and storage services remain within the intended local deployment. Configurable external endpoints prevent an unconditional “data never leaves the machine” promise; see [privacy](privacy.md).

Future behavior and result changes must update this record and affected docs in the same change, following [CONTRIBUTING](../CONTRIBUTING.md). Historical reports and frozen protocols remain records of their original runs.


### Evidence-consistent scoring — 2026-10-28

Engine 3.3.0 introduces `checked-skills-v1`: the LLM skills component is recomputed from final checked judgments (supported 1, partial 0.4, contradicted/unknown 0), equally weighted across requirements. No requirements gives zero evidence credit. Experience, impact and clarity remain uncalibrated model suggestions. The original model rubric and aggregate remain inspectable in the analysis and exported JSON. Reviewer corrections remain separate. Rule-only scoring is unchanged. Archived v8 measurements are preserved; this change is not a live DeepSeek evaluation rerun.

Validation for the scoring integration: 128 unit tests passed; 14 browser tests passed; lint passed; production build passed after permitting Next.js junction creation. Fixed review endpoint response narrowing uncovered by TypeScript. At that scoring-only checkpoint, diagnostics and evaluation were pending; the 2026-10-28 integration records below supersede that status.


### Model diagnostics and review preparation (2026-10-28)

The analysis result now offers a bounded, authenticated model readiness check and reports generation status, provider and elapsed time before the optional reviewer summary. Readiness distinguishes disabled, ready, missing-model, timeout, HTTP error, malformed response and unreachable service; installed does not guarantee successful generation. No endpoints, credentials or document content are returned by diagnostics. Generation errors are sanitized. The comparison CLI now loads the same local environment configuration as the app.

A blinded document packet, strict label import validator and [independent review guide](independent-review-guide.md) prepare external review. The current packet reuses synthetic cases and has no independent human labels. Human identity, unseen document families and adjudication remain manual verification requirements. Historical reports are retained; completed v9 runs are linked above.


The 2026-10-28 live guided example remains 4/4. Across all three v9 sets, 58 documents completed model inference with zero fallback; there are 9 mismatches across 72 judgments. The challenge and development scores are lower than archived v8; the cause of this variation has not been established.

### Scheduled follow-up closed — 2026-10-29

Removed the daily refinement automation after reviewing the completed automated milestones and new-example probe. Independent label review is the next dependency before further tuning; the 11 new-set mismatches remain open. Prepared materials are linked in [the review guide](independent-review-guide.md). No inference, tests, code changes or publishing occurred during this closure check; the measurements above are unchanged.

## Portfolio polish — 2026-10-29

Replaced the long README history with a concise product overview, explicit offline quick start, local DeepSeek instructions, architecture diagram and current results. Added an offline configuration template, a two-minute presentation script, rendered screenshots and a reproducible WebM capture. An isolated source copy installed 1,096 packages from the npm cache, passed production build, and completed the real browser review/export/save/reload flow with no page exceptions. See [setup verification](setup-verification.md) and [demo](demo.md). Model evaluations were not rerun; historical reports remain unchanged. Nothing pushed; private career notes remain ignored.
