import { createHash } from "node:crypto";

export type EmbeddingSource = "ollama-embedding" | "deterministic-fallback";

export type EmbeddingResult = {
  vectors: number[][];
  source: EmbeddingSource;
  model: string;
};

const DIMENSIONS = 256;

function deterministicEmbedding(text: string): number[] {
  const vector = Array<number>(DIMENSIONS).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9+#.]{2,}/g) ?? [];
  for (const token of tokens) {
    const hash = createHash("sha256").update(token).digest();
    const index = hash.readUInt16BE(0) % DIMENSIONS;
    vector[index] += hash[2] % 2 ? 1 : -1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}

export async function embedTexts(texts: string[]): Promise<EmbeddingResult> {
  const useOllama = process.env.ENABLE_LOCAL_EMBEDDINGS === "true";
  const model = process.env.OLLAMA_EMBEDDING_MODEL ?? "nomic-embed-text";
  if (useOllama) {
    try {
      const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
      const response = await fetch(`${baseUrl}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, input: texts }),
        signal: AbortSignal.timeout(30_000)
      });
      if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
      const payload = await response.json() as { embeddings?: number[][] };
      if (!payload.embeddings || payload.embeddings.length !== texts.length) throw new Error("Invalid embedding response");
      return { vectors: payload.embeddings, source: "ollama-embedding", model };
    } catch {
      // Offline behavior is intentional: the product must remain usable without a model.
    }
  }
  return { vectors: texts.map(deterministicEmbedding), source: "deterministic-fallback", model: "token-hash-v1" };
}

export function cosineSimilarity(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }
  if (!leftMagnitude || !rightMagnitude) return 0;
  return dot / Math.sqrt(leftMagnitude * rightMagnitude);
}
