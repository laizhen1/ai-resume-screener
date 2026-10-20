export const DEFAULT_LLM_MODEL = "deepseek-r1:7b";

export function localModel(role: "analysis" | "review" | "generation" = "generation") {
  const override = role === "analysis" ? process.env.OLLAMA_ANALYSIS_MODEL : role === "review" ? process.env.OLLAMA_REVIEW_MODEL : undefined;
  return override || process.env.OLLAMA_MODEL || DEFAULT_LLM_MODEL;
}

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

export function localTimeout() {
  return boundedInteger(process.env.OLLAMA_ANALYSIS_TIMEOUT_MS, 180_000, 1000, 300_000);
}

export function generationSettings(model: string, overrides: { temperature?: number; seed?: number } = {}) {
  const deepseek = model.toLowerCase().includes("deepseek-r1");
  return {
    think: process.env.OLLAMA_THINK === "true" ? true : process.env.OLLAMA_THINK === "false" ? false : deepseek,
    options: {
      temperature: overrides.temperature ?? (deepseek ? 0.6 : 0.1),
      seed: overrides.seed ?? 42,
      num_ctx: boundedInteger(process.env.OLLAMA_CONTEXT_LENGTH, 8192, 2048, 32768),
      num_predict: boundedInteger(process.env.OLLAMA_MAX_TOKENS, 4096, 256, 16384)
    }
  };
}

export function finalResponse(payload: unknown): string {
  if (!payload || typeof payload !== "object") throw new Error("Invalid local-model response.");
  const data = payload as { response?: unknown; done?: unknown; done_reason?: unknown };
  if (data.done === false || data.done_reason === "length") throw new Error("Local-model output was incomplete.");
  // Reasoning is not an answer: never promote the separate `thinking` field.
  if (typeof data.response !== "string" || !data.response.trim()) throw new Error("Local model returned no final answer.");
  const answer = data.response.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  if (!answer || /<\/?think>/.test(answer)) throw new Error("Local model returned incomplete reasoning.");
  return answer;
}
