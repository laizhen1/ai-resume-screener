import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

type Metric = { count: number; totalMs: number; errors: number };
const globalMetrics = globalThis as typeof globalThis & { __openResumeLabMetrics?: Map<string, Metric> };
const metrics = globalMetrics.__openResumeLabMetrics ?? new Map<string, Metric>();
globalMetrics.__openResumeLabMetrics = metrics;

export function registerTelemetry() {
  console.info(JSON.stringify({ level: "info", operation: "telemetry.register", runtime: process.env.NEXT_RUNTIME ?? "nodejs" }));
}

export async function traced<T>(operation: string, task: (traceId: string) => Promise<T>): Promise<T> {
  const traceId = randomUUID();
  const started = performance.now();
  let failed = false;
  try {
    return await task(traceId);
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    const elapsedMs = performance.now() - started;
    const current = metrics.get(operation) ?? { count: 0, totalMs: 0, errors: 0 };
    current.count += 1;
    current.totalMs += elapsedMs;
    if (failed) current.errors += 1;
    metrics.set(operation, current);
    console.info(JSON.stringify({ level: "info", operation, traceId, elapsedMs: Math.round(elapsedMs), failed }));
  }
}

export function metricsSnapshot() {
  return [...metrics.entries()].map(([operation, metric]) => ({
    operation,
    count: metric.count,
    errors: metric.errors,
    averageMs: metric.count ? Math.round((metric.totalMs / metric.count) * 100) / 100 : 0
  }));
}
