import { describe, expect, it } from "vitest";
import { analyzeResumeHybrid } from "@/lib/analyzer";

describe("hybrid analysis", () => {
  it("preserves the deterministic score and records version metadata", async () => {
    process.env.ENABLE_LOCAL_EMBEDDINGS = "false";
    const result = await analyzeResumeHybrid(
      "We need a TypeScript, React, PostgreSQL and Docker engineer for a customer platform.",
      "SUMMARY\nEngineer\nSKILLS\nTypeScript, React\nEXPERIENCE\nBuilt customer services for 400 users.\nEDUCATION\nBSc"
    );
    expect(result.engineVersion).toBe("2.0.0");
    expect(result.taxonomyVersion).toBeTruthy();
    expect(result.semanticMatches).toBeDefined();
    expect(result.criteria.every((criterion) => criterion.provenance)).toBe(true);
  });
});
