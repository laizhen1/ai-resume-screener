import { analysisSchema } from "../lib/ai-analysis";

type Context = { vars: Record<string, unknown> };
const grade = (pass: boolean, reason: string) => ({ pass, score: pass ? 1 : 0, reason });
function parse(output: unknown) { return analysisSchema.parse(typeof output === "string" ? JSON.parse(output) : output); }

export function schema(output: unknown) {
  try { parse(output); return grade(true, "Application schema is valid"); }
  catch { return grade(false, "Output failed application schema"); }
}

export function citations(output: unknown, context: Context) {
  try {
    const result = parse(output);
    const resume = String(context.vars.resume ?? ""), job = String(context.vars.job ?? "");
    const valid = result.requirements.every(r => job.includes(r.sourceText) &&
      (r.verdict === "unknown" && !r.evidenceText || Boolean(r.evidenceText && resume.includes(r.evidenceText)))) &&
      result.criteria.every(c => c.evidence.every(quote => resume.includes(quote)));
    return grade(valid, valid ? "All cited quotes exist in the supplied source" : "Missing or fabricated source citation");
  } catch { return grade(false, "Cannot validate citations on invalid output"); }
}

export function verdict(output: unknown, context: Context) {
  try {
    const result = parse(output);
    const requirement = result.requirements.find(r => r.skill.toLowerCase() === String(context.vars.skill).toLowerCase());
    return grade(requirement?.verdict === context.vars.expected, `Expected ${context.vars.expected}; received ${requirement?.verdict ?? "missing requirement"}`);
  } catch { return grade(false, "Cannot validate verdict on invalid output"); }
}
