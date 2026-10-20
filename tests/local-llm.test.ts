import { afterEach, describe, expect, it, vi } from "vitest";
import { finalResponse, generationSettings, localModel, localTimeout } from "@/lib/local-llm";

afterEach(() => vi.unstubAllEnvs());
describe("local DeepSeek adapter", () => {
  it("uses DeepSeek by default and respects role-specific overrides", () => {
    vi.stubEnv("OLLAMA_MODEL", ""); vi.stubEnv("OLLAMA_ANALYSIS_MODEL", "");
    expect(localModel("analysis")).toBe("deepseek-r1:7b");
    vi.stubEnv("OLLAMA_MODEL", "deepseek-r1:1.5b");
    expect(localModel("analysis")).toBe("deepseek-r1:1.5b");
    vi.stubEnv("OLLAMA_ANALYSIS_MODEL", "custom-model");
    expect(localModel("analysis")).toBe("custom-model");
  });
  it("bounds resource settings and preserves explicit evaluation temperature", () => {
    vi.stubEnv("OLLAMA_THINK", ""); vi.stubEnv("OLLAMA_CONTEXT_LENGTH", "-1");
    vi.stubEnv("OLLAMA_MAX_TOKENS", "not-a-number"); vi.stubEnv("OLLAMA_ANALYSIS_TIMEOUT_MS", "Infinity");
    expect(generationSettings("deepseek-r1:7b", { temperature: 0 }).options).toEqual({ temperature: 0, seed: 42, num_ctx: 8192, num_predict: 4096 });
    expect(generationSettings("deepseek-r1:7b").think).toBe(true);
    expect(localTimeout()).toBe(180000);
    vi.stubEnv("OLLAMA_THINK", "false");
    expect(generationSettings("deepseek-r1:7b").think).toBe(false);
  });
  it("reads the final answer and excludes separate or embedded reasoning", () => {
    expect(finalResponse({ response: '{"ok":true}', thinking: "private intermediate text" })).toBe('{"ok":true}');
    expect(finalResponse({ response: '<think>intermediate text</think>{"ok":true}' })).toBe('{"ok":true}');
    expect(() => finalResponse({ thinking: '{"ok":true}' })).toThrow("no final answer");
    expect(() => finalResponse({ response: '<think>unfinished {"ok":true}' })).toThrow("incomplete reasoning");
  });
  it("rejects token-limited output even if the partial body happens to parse", () => {
    expect(() => finalResponse({ response: '{"ok":true}', done_reason: "length" })).toThrow("incomplete");
  });
});
