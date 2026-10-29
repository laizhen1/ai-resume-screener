# Refinement plan

Approved 2026-10-28. This is a staged integration plan, not a claim that every capability below is complete. Estimated effort: 3–5 focused work sessions; independent labeling has a separate human dependency. Continue the next unfinished milestone after checking the working tree and this record.

## Milestone 1 — evidence review and workflow continuity

Implemented; final validation recorded in [progress](progress.md).

- Select a requirement to highlight its exact quote in the extracted résumé text, including uploaded documents. Do not reconstruct a PDF layout or highlight approximate matches as exact evidence.
- Record a four-state reviewer judgment and explanation without overwriting automated judgments or the score; export a JSON review or plain-text summary.
- Preserve the analysis while navigating in the same tab using in-memory React state. Refresh, tab closure and the explicit clear action remove the draft. Do not put résumé contents in localStorage.
- Import the original server analysis into a new job/candidate without another model call. A 30-minute, process-keyed signed receipt rejects tampered or expired results. Authenticated, idempotent imports use the configured memory/PostgreSQL repository.
- Review the saved candidate, retain corrections and audit the change. Original model outputs remain available.

Acceptance: provenance/CRLF and malformed-quote checks, receipt tampering/expiry, concurrent import deduplication, authentication, correction validation/audit, source-to-workspace browser flow, navigation/clear behavior, mobile overflow, lint and production build.

## Milestone 2 — evidence-consistent scoring

Implemented scoring policy and original-rubric inspection on 2026-10-28; validation is recorded in progress. Make the skills component reflect final checked verdicts while preserving the original model-proposed rubric as inspectable metadata. Decide how experience/impact/clarity relate to evidence; avoid quietly claiming that the whole score is calibrated. Reviewer overrides must remain separate unless an explicitly labeled reviewed score is introduced. Version the engine/scoring policy, add positive and negative controls, and retain old reports. Do not change archived measurements to match new code.

## Milestone 3 — readiness and runtime diagnostics

Implemented bounded Ollama readiness and per-analysis status/timing on 2026-10-28. Surface enabled/disabled, reachable/missing-model and timeout/malformed-output distinctions without exposing internal URLs or secrets. Add bounded readiness checks and per-analysis timing/provider/fallback diagnostics. Measure latency distributions using fictional fixtures before optimizing. Distinguish unavailable services from intentionally disabled AI. Reuse installed models; do not download large weights or change endpoint configuration silently.

## Milestone 4 — independent evaluation preparation

Prepared a blinded packet, strict completeness/hash/provenance validator and label guide on 2026-10-28. Human independence and adjudication are not automated. Prepare a label guide, independent-review import/export format, reviewer provenance and adjudication checks. Separate unseen document families from development data; include multilingual and document-format coverage. Agent-authored examples and labels must remain explicitly provisional. Independence requires a human or separately sourced reviewer and must not be inferred from another agent's output. Prepare concrete materials before requesting reviewer input. No live hiring data without consent.

## Milestone 5 — remaining errors and measured integration

Completed the known-regression integration on 2026-10-28: engine 3.4.1, scoped evidence prompt and audited source boundaries. All 72 reused benchmark judgments match on paired rechecks of fresh v10 generations; fresh controls 16/16 and guided example 4/4. See [v10 report](../reports/deepseek-v10-results.md). Raw model mistakes remain visible; this is not perfect general performance. Remaining work requires independently sourced/labeled, family-disjoint multilingual/document-format coverage. Do not continue tuning to these now-reused regression labels.

## Continuation rules

- The daily local follow-up was removed on 2026-10-29 after the automated milestones and new-example probe completed. Further evaluation improvement awaits independent review of label boundaries; the prepared review materials remain available. At that checkpoint, the 11 new-set mismatches remained open. They were subsequently resolved in v11; v12 resolves the six remaining transfer/control/temporal judgments, as recorded below.
- Keep existing UI edits and private career documents intact. Update public docs and local-only Chinese notes with actual validation. Never commit private résumé/interview files.
- No publishing or GitHub push is included in this refinement authorization.
- A passing unit/browser suite does not mean a live DeepSeek evaluation was rerun. State the distinction in every results update.


## New-example probe — completed

A frozen 24-document/48-judgment set was evaluated once against unchanged engine 3.4.1: rules 26/48, raw DeepSeek 35/48, checked 37/48 (77.1%, macro F1 0.7632). All 24 model calls completed without fallback. Source checks repaired two raw errors and harmed zero correct raw judgments. Eleven provisional-label mismatches remain, chiefly false denials. See [new-set report](../reports/novel-generalization-v1.md). No fixes or label changes were made after observing the results. This set is now inspected; if it is used for future development, do not keep presenting it as untouched generalization evidence. Obtain independently reviewed labels and another frozen unseen set before claiming broader improvement.


## User-approved v11 continuation — 2026-10-29

Confirmed five label boundaries and fixed 11/11 original mismatches. Fresh inspected result 48/48; final replay 48/48. New B first-use 27/32, final replay 28/32 after repairing a check-induced temporal regression. Fresh C controls 15/16, temporal confirmations 3/4, guided 4/4. Validation: 184 unit tests, 15 browser tests, lint and build. See [report](../reports/deepseek-v11-results.md) for all residual errors. B is now inspected; retain its original first-use score. The daily automation remains removed; this was directly requested work. Broader validation still needs independent labels and disjoint families.


## V12 remaining-error continuation — 2026-10-29

Fresh rerun completed: transfer 32/32, controls 16/16, temporal 4/4, guided 4/4. Resolved 6/6 requested case/skill failures. 200 unit tests, 15 browser tests, lint and build passed. All examples are now inspected regression material; no labels or historical measurements were replaced. See [report](../reports/deepseek-v12-results.md). The daily automation remains off; no push was performed.


## New-example probe v2 — 2026-10-29

On 16 first-use synthetic documents (32 judgments), unchanged engine **3.6.0** scored **28/32 (87.5%)**, four-class macro F1 **0.8576** after checks; raw DeepSeek scored **27/32**. There were **4 checked mismatches**. Documents and provisional agent labels were frozen before this single-pass run. These are new examples of partly familiar mechanisms, not independently annotated or family-disjoint evaluation. [Report](../reports/novel-generalization-v2.md). This first-use result is preserved; these examples are now inspected diagnostics. Independent review remains outstanding.


## V13 continuation — 2026-10-29

Engine **3.7.1** fresh DeepSeek rerun: inspected examples **32/32**, new synthetic controls **16/16**, guided **4/4**. **4/4** prior mismatches now match their labels. New-control four-class macro F1 **1.0000**; raw model **12/16**. New controls were frozen before inference but use familiar failure mechanisms and agent-authored labels; they are not independent or family-disjoint evaluation. [Report](../reports/deepseek-v13-results.md). Independent review remains outstanding; the new controls are now inspected material. Daily automation remains off.

## Final portfolio polish — 2026-10-29

Completed README setup verification in an isolated source directory, offline demo recording and screenshots, concise architecture/results overview, and linked technical setup guides. See [verification](setup-verification.md). Independent evaluation remains a separate next step; no recurring automation or publishing was enabled.
