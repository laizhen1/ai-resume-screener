# Project progress

Status reviewed: **2026-10-20**. Current engine: **3.2.0**. Latest measured DeepSeek revision: **v8**, retaining prompt **core-analysis-v7-enumerated-categories**, category policy **evidence-category-v1** and checks **evidence-eligibility-v1**. This documentation synchronization did not change inference code or rerun models.

## Implemented

- Multi-format résumé ingestion, image OCR, job workspaces, batches, comparison and human review; optional PostgreSQL/pgvector storage and Redis background work.
- Local **DeepSeek-R1-Distill-Qwen-7B** via Ollama (`deepseek-r1:7b`). Dictionary/alias-based extraction supplies known requirement keys; the model selects source passages and evidence categories and may propose source-cited additional requirements.
- Fixed category-to-verdict mapping, source/identity validation and bounded eligibility checks. Original responses and check decisions remain inspectable. Four criterion scores are separate and are not recalibrated after abstention.
- Optional Python retrieval/evidence service: BM25 + vectors + RRF, cross-encoder reranking, NLI evidence analysis and cited Q&A. These optional components are not the source of the v8 DeepSeek score.
- Six comparison pipelines, review feedback, exportable per-case reports and v1–v8 revision records with failed results retained. Error attribution is supported by the evaluation page and report tables, not a separate Bad Case module.
- [Approved Chinese resume](resume-project-zh.txt) and [STAR/interview preparation](STAR-resume-zh.txt), including the development baseline counterexample and conditional local-processing claims.

## Latest measured results

| Dataset | Rules | DeepSeek categories + policy | With evidence checks | Checked four-class macro F1 |
| --- | ---: | ---: | ---: | ---: |
| Development | 24/24 | 21/24 | 22/24 | 0.9321 |
| Reused diagnostic | 20/24 | 20/24 | 23/24 | 0.9580 |
| New synthetic challenge | 15/24 | 15/24 | 23/24 | 0.9496 |

Development has 10 documents and 24 requirement judgments; each other set has 24 documents and one judgment per document. The two DeepSeek variants share one generation per document. The challenge rules and labels were authored by the same agent: it is synthetic, provisionally labeled, not independently annotated or blind. Its 23/24 (95.8%) and four-class macro F1 0.9496 are application-pipeline measurements, not proof of generalization or hiring validity.

The guided example is **4/4**. The 58 development/diagnostic/challenge documents completed real model inference with no rule fallback. The original four diagnostic cases now match their labels; saved v7-output replay reaches 24/24 with zero new model calls, while the fresh diagnostic is 23/24. Keep replay and live results separate.

Source: [v8 detailed report](../reports/deepseek-revision.md), [all measured results](../reports/README.md), [development JSON](../reports/development-deepseek-v8.json), [diagnostic JSON](../reports/diagnostic-deepseek-v8.json), [challenge JSON](../reports/challenge-deepseek-v8.json).

## Last completed code validation

- 109 TypeScript tests across 16 files.
- 8 Playwright browser tests, including challenge selection/export; an initial shared-state test race was fixed by running the related scenarios sequentially.
- ESLint and production build passed.
- 23 saved comparison reports passed internal-consistency verification. This verifies recorded predictions/metrics, not independent label quality.
- Optional transformer/training, Docker deployment, real recruitment outcomes and fairness evaluation were not rerun or established by v8.

## Remaining measured mismatches

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
3. Evaluate criterion-score consistency with checked evidence; current aggregate scores remain uncalibrated.
4. Broaden document-format, multilingual and attribution coverage, then separately assess deployment/performance needs.
5. An authenticated, read-only project MCP server remains planned, not implemented.

## Documentation and privacy scope

The README, architecture, evidence policy, scoring, dataset card, privacy and report index now describe the same current pipeline. Fully local inference is supported when model, OCR and storage services remain within the intended local deployment. Configurable external endpoints prevent an unconditional “data never leaves the machine” promise; see [privacy](privacy.md).

Future behavior and result changes must update this record and affected docs in the same change, following [CONTRIBUTING](../CONTRIBUTING.md). Historical reports and frozen protocols remain records of their original runs.
