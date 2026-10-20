import { analyzeWithOllama } from "../lib/ai-analysis";
import { DEFAULT_SCORING_WEIGHTS } from "../lib/analyzer";
import { localModel, localTimeout } from "../lib/local-llm";

// Uses the application's real prompt, parser and provider path; no deterministic fallback.
export default class ResumeAnalysisProvider {
  private config: { model?: string; temperature?: number };
  constructor(options: { config?: { model?: string; temperature?: number } } = {}) { this.config = options.config ?? {}; }
  id() { return `resume-analysis:${this.config.model ?? localModel("analysis")}:${this.config.temperature ?? 0}`; }
  async callApi(_prompt: string, context: { vars: Record<string, unknown> }) {
    if (typeof context.vars.job !== "string" || typeof context.vars.resume !== "string") return { error: "Missing job/resume variables" };
    const response = await analyzeWithOllama(context.vars.job, context.vars.resume, DEFAULT_SCORING_WEIGHTS, {
      model: this.config.model ?? localModel("analysis"), seed: 42,
      temperature: this.config.temperature ?? 0, timeoutMs: localTimeout()
    });
    return response ? { output: JSON.stringify(response.draft) } : { error: "Ollama unavailable or output failed application validation; no fallback used" };
  }
}
