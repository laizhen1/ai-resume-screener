import { describe, expect, it } from "vitest";
import { generateBenchmarkDataset, runEvaluation } from "@/lib/evaluation";

describe("evaluation laboratory", () => {
  it("generates a reproducible synthetic dataset", () => {
    expect(generateBenchmarkDataset(25)).toHaveLength(25);
    expect(generateBenchmarkDataset(2)).toEqual(generateBenchmarkDataset(2));
  });

  it("reports bounded quality and consistency metrics", () => {
    const result = runEvaluation(25);
    expect(result.datasetSize).toBe(25);
    expect(result.metrics.precision).toBeGreaterThanOrEqual(0);
    expect(result.metrics.precision).toBeLessThanOrEqual(1);
    expect(result.metrics.counterfactualConsistency).toBe(1);
  });
});
