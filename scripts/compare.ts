import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { runComparison } from "../lib/experiments/runner";

async function main() {
  const { values } = parseArgs({ options: {
    split: { type: "string", default: "development" },
    model: { type: "string" },
    "with-model": { type: "boolean", default: false },
    output: { type: "string" },
    "min-accuracy": { type: "string" }
  } });
  if (values.split !== "heldout" && values.split !== "development") throw new Error("--split must be development or heldout.");
  const minimum = values["min-accuracy"] === undefined ? undefined : Number(values["min-accuracy"]);
  if (minimum !== undefined && (!Number.isFinite(minimum) || minimum < 0 || minimum > 1)) throw new Error("--min-accuracy must be between 0 and 1.");
  if (minimum !== undefined && values.split !== "development") throw new Error("Release gates use development data. Do not optimize against held-out scores.");
  const report = await runComparison({ split: values.split, includeModel: values["with-model"] || Boolean(values.model), model: values.model }, (done, total) => console.error(`Evaluated ${done}/${total} unique cases`));
  if (values.output) {
    const target = resolve(values.output); await mkdir(dirname(target), { recursive: true }); await writeFile(target, JSON.stringify(report, null, 2) + "\n");
    console.error(`Saved report: ${target}`);
  }
  console.log(JSON.stringify({ dataset: report.dataset, configuration: report.configuration, summaries: report.summaries }, null, 2));
  if (minimum !== undefined && (report.summaries[0].accuracy ?? 0) < minimum) process.exitCode = 1;
  if (report.configuration.includeModel && report.summaries.some(summary => summary.status !== "complete")) {
    console.error("Requested model comparison is incomplete; inspect unavailable and fallback counts."); process.exitCode = 2;
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
