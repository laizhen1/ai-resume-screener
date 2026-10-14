import { analyzeWithOllama } from "../lib/ai-analysis";
import { DEFAULT_SCORING_WEIGHTS } from "../lib/analyzer";

// Uses the application's real prompt, parser and provider path; no deterministic fallback.
export default class ResumeAnalysisProvider {
  private config: { model?: string; temperature?: number };
  constructor(options: { config?: { model?: string; temperature?: number } } = {}) { this.config = options.config ?? {}; }
  id() { return `resume-analysis:${this.config.model ?? process.env.OLLAMA_ANALYSIS_MODEL ?? "qwen3:4b"}:${this.config.temperature ?? 0}`; }
  async callApi(_prompt: string, context: { vars: Record<string, unknown> }) {
    if (typeof context.vars.job !== "string" || typeof context.vars.resume !== "string") return { error: "Missing job/resume variables" };
    const response = await analyzeWithOllama(context.vars.job, context.vars.resume, DEFAULT_SCORING_WEIGHTS, {
      model: this.config.model ?? process.env.OLLAMA_ANALYSIS_MODEL ?? "qwen3:4b", seed: 42,
      temperature: this.config.temperature ?? 0, timeoutMs: 90000
    });
    return response ? { output: JSON.stringify(response.draft) } : { error: "Ollama unavailable or output failed application validation; no fallback used" };
  }
}
