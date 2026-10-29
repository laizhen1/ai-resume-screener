# Independent evaluation preparation

Run `npx tsx scripts/prepare-review.ts export challenge reports/review-packet.json` to export documents and skill keys without expected labels or model predictions. Output creation refuses overwrites. Run `npx tsx scripts/prepare-review.ts validate reports/review-packet.json labels.json` to verify packet hash, completeness, duplicate keys and label provenance.

Each label is an object in a JSON array: caseId, skill, verdict, reason (at least 10 characters), reviewer, family, source (human/external/agent). These are provenance declarations, not proof of independence. Never publish a reviewer's personal identity without consent; use a pseudonymous identifier.

## Label policy

Supported: applicant personally used or delivered the skill. Partial: current learning, beginner coursework or limited familiarity. Contradicted: explicit denial of experience; prioritize explicit denial over a simultaneous learning claim. Unknown: bare lists, future intentions without present study/use, other people's work, instructions or ambiguous evidence. Quote the decisive phrase in the reason. Judge each skill separately.

## Collection and adjudication

Obtain separately sourced fictional document families before claiming generalization. Keep paraphrases and translated variants of one family in the same split. Include English/Chinese and PDF/DOCX/TXT extraction cases; these are coverage targets, not completed measurements. Freeze documents, hashes and labels before model execution. Use two reviewers blinded to model predictions. Retain both original annotation files; resolve disagreements in a third adjudication file with reviewer, original verdicts, final verdict and rationale. Never silently overwrite disagreements.

The supplied packet reuses synthetic challenge material. Relabeling it can assess agreement but cannot make it unseen. Agent-authored labels remain provisional. Human provenance, family separation and adjudication are manual checks; the validator checks structure only. No independent labels have yet been obtained.


A new first-use probe is available in [novel-generalization-v1-frozen.json](../reports/novel-generalization-v1-frozen.json), with annotation rationales and lexical-overlap audit. It scored 37/48 under the frozen pipeline and remains agent-labeled. Prioritize human adjudication of non-claims versus explicit denial, scoped nonparticipation and temporal changes. The published result is immutable; any adjudicated label revision needs a new dataset version and separately reported metrics.

## User policy review — 2026-10-29

The project owner confirmed five proposed boundaries after seeing the model predictions: novel-01/Redis and novel-11/GitHub Actions are partial; novel-14/Python, novel-20/Terraform and novel-23/Azure are unknown. This is disclosed policy adjudication, not blinded independent annotation. The original frozen labels were unchanged. See [decision record](../reports/v11-label-review.json).

Apply these distinctions consistently: current beginner practice or supervised sample modification is partial; absence of a claim or evidence is unknown; denial of participation in one specific contractor project does not establish a global absence of skill experience. An explicit current denial of experience remains contradicted. Explicit later delivery can supersede a dated, retracted denial. Preserve quotations, original predictions and versioned reports when implementing these boundaries.


The v11 [report](../reports/deepseek-v11-results.md) separates new transfer first-use results, post-inspection replay and newly frozen repair controls. B and C now have observed outputs; neither should be presented as untouched in future tuning. Their frozen labels were not changed.


## V12 regression status — 2026-10-29

Transfer B, controls C and temporal confirmations have now been inspected and used for v12 refinement. Their fresh checked scores are 32/32, 16/16 and 4/4 respectively; guided is 4/4. These sets cannot supply independent or unseen evaluation evidence. Keep future independently sourced review separate; see the [v12 report](../reports/deepseek-v12-results.md).


## New-example probe v2 — 2026-10-29

On 16 first-use synthetic documents (32 judgments), unchanged engine **3.6.0** scored **28/32 (87.5%)**, four-class macro F1 **0.8576** after checks; raw DeepSeek scored **27/32**. There were **4 checked mismatches**. Documents and provisional agent labels were frozen before this single-pass run. These are new examples of partly familiar mechanisms, not independently annotated or family-disjoint evaluation. [Report](../reports/novel-generalization-v2.md). This first-use result is preserved; these examples are now inspected diagnostics. Independent review remains outstanding.


## V13 continuation — 2026-10-29

Engine **3.7.1** fresh DeepSeek rerun: inspected examples **32/32**, new synthetic controls **16/16**, guided **4/4**. **4/4** prior mismatches now match their labels. New-control four-class macro F1 **1.0000**; raw model **12/16**. New controls were frozen before inference but use familiar failure mechanisms and agent-authored labels; they are not independent or family-disjoint evaluation. [Report](../reports/deepseek-v13-results.md). Independent review remains outstanding; the new controls are now inspected material. Daily automation remains off.
