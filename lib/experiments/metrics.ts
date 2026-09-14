import { VERDICTS, type CaseResult, type Pipeline, type PipelineMetrics } from "./types";

const fraction = (a: number, b: number) => b ? a / b : null;
export function summarize(pipeline: Pipeline, all: CaseResult[]): PipelineMetrics {
  const rows = all.filter(row => row.pipeline === pipeline);
  const evaluated = rows.filter(row => row.predictions.length > 0);
  const predictions = evaluated.flatMap(row => row.predictions);
  const confusion = VERDICTS.map(() => VERDICTS.map(() => 0));
  for (const p of predictions) confusion[VERDICTS.indexOf(p.expected)][VERDICTS.indexOf(p.actual)]++;
  const n = predictions.length;
  const correct = predictions.filter(p => p.expected === p.actual).length;
  const accuracy = fraction(correct, n);
  const f1s = VERDICTS.map((_, i) => {
    const tp = confusion[i][i];
    const fp = confusion.reduce((sum, row) => sum + row[i], 0) - tp;
    const fn = confusion[i].reduce((a, b) => a + b, 0) - tp;
    return 2 * tp / Math.max(1, 2 * tp + fp + fn);
  });
  const supported = predictions.filter(p => p.actual === "supported");
  const supportTP = supported.filter(p => p.expected === "supported").length;
  const resolved = predictions.filter(p => p.actual !== "unknown");
  const latencies = evaluated.map(row => row.latencyMs).sort((a, b) => a - b);
  const percentile = (p: number) => latencies.length ? latencies[Math.max(0, Math.ceil(p * latencies.length) - 1)] : null;
  // Wilson interval only for the held-out set's independent, one-requirement cases.
  // Development cases contain correlated requirements; no independence claim there.
  let accuracyInterval: [number, number] | null = null;
  if (n && evaluated.every(row => row.predictions.length === 1)) {
    const z = 1.96, p = correct / n, denominator = 1 + z * z / n;
    const center = (p + z * z / (2 * n)) / denominator;
    const margin = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denominator;
    accuracyInterval = [Math.max(0, center - margin), Math.min(1, center + margin)];
  }
  return {
    pipeline, status: !evaluated.length ? rows.some(row => row.provider === "unavailable") ? "unavailable" : "not-run" : evaluated.length === rows.length && !evaluated.some(row => row.provider === "fallback") ? "complete" : "partial",
    evaluatedCases: evaluated.length, totalCases: rows.length,
    modelCases: evaluated.filter(row => row.provider === "ollama").length,
    fallbackCases: evaluated.filter(row => row.provider === "fallback").length,
    accuracy, macroF1: n ? f1s.reduce((a, b) => a + b, 0) / 4 : null,
    supportPrecision: fraction(supportTP, supported.length),
    supportRecall: fraction(supportTP, predictions.filter(p => p.expected === "supported").length),
    abstentionRate: fraction(predictions.filter(p => p.actual === "unknown").length, n),
    unsupportedSupportRate: fraction(supported.length - supportTP, supported.length),
    invalidCitationRate: fraction(resolved.filter(p => !p.citationValid).length, resolved.length),
    missingRequirementRate: fraction(predictions.filter(p => p.missing).length, n),
    p50LatencyMs: percentile(0.5), p95LatencyMs: percentile(0.95), accuracyInterval, confusion,
    slices: [...new Set(evaluated.map(row => row.challenge))].map(challenge => {
      const items = evaluated.filter(row => row.challenge === challenge).flatMap(row => row.predictions);
      return { challenge, correct: items.filter(p => p.expected === p.actual).length, total: items.length };
    })
  };
}
