import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { verifyReport } from "../lib/verify-report";
import type { ExperimentReport } from "../lib/experiments/types";

async function main() {
  const paths = process.argv.slice(2);
  if (!paths.length) paths.push("reports/development.json", "reports/heldout-rules.json", "reports/development-transformers.json", "reports/heldout-transformers.json");
  const checked = [];
  for (const path of paths) {
    const bytes = await readFile(path);
    const report: ExperimentReport = JSON.parse(bytes.toString("utf8"));
    verifyReport(report);
    checked.push({ path, sha256: createHash("sha256").update(bytes).digest("hex"), dataset: report.dataset, recordedAt: report.createdAt,
      results: report.summaries.map(summary => ({ pipeline: summary.pipeline, status: summary.status, evaluatedCases: summary.evaluatedCases, modelCases: summary.modelCases, fallbackCases: summary.fallbackCases,
        correct: summary.confusion.reduce((n, row, i) => n + row[i], 0), judgments: summary.confusion.flat().reduce((a, b) => a + b, 0), accuracy: summary.accuracy, macroF1: summary.macroF1, supportPrecision: summary.supportPrecision })) });
  }
  console.log(JSON.stringify({ check: "Internal consistency only; saved model runs were not rerun and labels were not independently reviewed.", reports: checked }, null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
