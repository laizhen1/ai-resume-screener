import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { analyzeResume, ENGINE_VERSION } from "../lib/analyzer";
import { z } from "zod";

const rowSchema = z.object({ id: z.string(), requirement: z.string().min(1), passage: z.string().min(1), skill: z.string().min(1) });
async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error("Usage: npm run ml:baseline -- test.jsonl baseline.json");
  const bytes = await readFile(input);
  const rows = bytes.toString("utf8").split(/\r?\n/).filter(line => line.trim()).map(line => rowSchema.parse(JSON.parse(line)));
  if (!rows.length || new Set(rows.map(r => r.id)).size !== rows.length) throw new Error("Expected nonempty unique cases");
  const predictions = rows.map(row => {
    const analysis = analyzeResume(row.requirement, row.passage);
    const assessment = analysis.requirementAssessments?.find(a => a.skill === row.skill.toLowerCase());
    if (!assessment) throw new Error(`No taxonomy requirement for ${row.id}; choose a supported canonical skill for the rules comparison`);
    return { id: row.id, actual: assessment.verdict, quote: assessment.evidence?.text ?? null };
  });
  await writeFile(output, JSON.stringify({ datasetHash: createHash("sha256").update(bytes).digest("hex"), engineVersion: ENGINE_VERSION, predictions }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
