import { createClient } from "redis";
import { analyzeResumeHybrid, type ScoringWeights } from "./analyzer";
import { getRepository } from "./repository";

export type AnalysisTask = { candidateId: string; jobDescription: string; resumeText: string; actor: string; weights: ScoringWeights };
const QUEUE_KEY = "open-resume-lab:analysis";

export async function processAnalysisTask(task: AnalysisTask) {
  const repository = await getRepository();
  const analysis = await analyzeResumeHybrid(task.jobDescription, task.resumeText, task.weights);
  await repository.updateCandidate(task.candidateId, { analysis });
  await repository.addAudit({ actor: task.actor, action: "analysis.completed", entityType: "candidate", entityId: task.candidateId, metadata: { engineVersion: analysis.engineVersion } });
}

export async function enqueueAnalysis(task: AnalysisTask): Promise<"queued" | "completed"> {
  if (process.env.QUEUE_MODE !== "redis") {
    await processAnalysisTask(task);
    return "completed";
  }
  if (!process.env.REDIS_URL) throw new Error("REDIS_URL is required when QUEUE_MODE=redis.");
  const client = createClient({ url: process.env.REDIS_URL });
  await client.connect();
  try {
    await client.lPush(QUEUE_KEY, JSON.stringify(task));
  } finally {
    await client.quit();
  }
  return "queued";
}

export async function runWorker() {
  if (!process.env.REDIS_URL) throw new Error("REDIS_URL is required for the worker.");
  const client = createClient({ url: process.env.REDIS_URL });
  await client.connect();
  console.info("Analysis worker is ready.");
  while (true) {
    const result = await client.brPop(QUEUE_KEY, 5);
    if (!result) continue;
    try {
      await processAnalysisTask(JSON.parse(result.element) as AnalysisTask);
    } catch (error) {
      console.error("Analysis task failed", error);
    }
  }
}
