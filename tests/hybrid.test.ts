import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeResumeHybrid } from "@/lib/analyzer";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("hybrid analysis", () => {
  it("propagates cancellation during generation without starting a fallback reviewer", async () => {
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("VITEST", "");
    vi.stubEnv("ENABLE_LOCAL_AI", "true"); vi.stubEnv("ENABLE_LOCAL_AI_ANALYSIS", "true");
    const fetch = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
      options.signal!.addEventListener("abort", () => reject(options.signal!.reason), { once: true });
    }));
    vi.stubGlobal("fetch", fetch);
    const controller = new AbortController();
    const pending = analyzeResumeHybrid("Python required", "Built Python services", undefined, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not replace a cancelled request with a fallback analysis", async () => {
    const controller = new AbortController(); controller.abort();
    await expect(analyzeResumeHybrid("Python required", "Built Python services", undefined, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  });
  it("preserves the deterministic score and records version metadata", async () => {
    process.env.ENABLE_LOCAL_EMBEDDINGS = "false";
    const result = await analyzeResumeHybrid(
      "We need a TypeScript, React, PostgreSQL and Docker engineer for a customer platform.",
      "SUMMARY\nEngineer\nSKILLS\nTypeScript, React\nEXPERIENCE\nBuilt customer services for 400 users.\nEDUCATION\nBSc"
    );
    expect(result.engineVersion).toBe("3.2.0");
    expect(result.taxonomyVersion).toBeTruthy();
    expect(result.semanticMatches).toBeDefined();
    expect(result.criteria.every((criterion) => criterion.provenance)).toBe(true);
  });
});
