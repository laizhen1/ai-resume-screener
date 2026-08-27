import { performance } from "node:perf_hooks";
import { analyzeResume, ENGINE_VERSION } from "./analyzer";
import type { EvidenceVerdict } from "./types";

export const EVALUATION_DATASET_VERSION = "adversarial-context-v2.0";

export type BenchmarkCase = {
  id: string;
  job: string;
  resume: string;
  expectedVerdicts: Record<string, EvidenceVerdict>;
  challenge: "exact" | "alias" | "negation" | "aspirational" | "ambiguity" | "missing";
};

const FIXTURES: Omit<BenchmarkCase, "id">[] = [
  {
    challenge: "exact",
    job: "This role requires TypeScript and React for customer-facing products.",
    resume: "Example Candidate\nSKILLS\nTypeScript, React\nEXPERIENCE\nBuilt and shipped production TypeScript services and React interfaces for 2,000 users.\nEDUCATION\nExample University",
    expectedVerdicts: { typescript: "supported", react: "supported" }
  },
  {
    challenge: "alias",
    job: "We need Node.js, PostgreSQL and Docker experience.",
    resume: "Example Candidate\nSUMMARY\nBackend engineer\nEXPERIENCE\nBuilt a NodeJS service backed by Postgres. Currently learning Docker through a personal course.\nEDUCATION\nExample University",
    expectedVerdicts: { "node.js": "supported", postgresql: "supported", docker: "partial" }
  },
  {
    challenge: "negation",
    job: "React and Docker are required for this role.",
    resume: "Example Candidate\nSUMMARY\nPlatform engineer\nEXPERIENCE\nNo professional experience with React. Never used Docker in production.\nEDUCATION\nExample University",
    expectedVerdicts: { react: "contradicted", docker: "contradicted" }
  },
  {
    challenge: "aspirational",
    job: "The role requires Terraform and Kubernetes.",
    resume: "Example Candidate\nSUMMARY\nCloud support engineer\nEXPERIENCE\nCurrently learning Terraform and exploring Kubernetes in a training environment.\nEDUCATION\nExample University",
    expectedVerdicts: { terraform: "partial", kubernetes: "partial" }
  },
  {
    challenge: "ambiguity",
    job: "Experience with React and Go is essential.",
    resume: "Example Candidate\nSUMMARY\nOperations coordinator\nEXPERIENCE\nReact to customer incidents quickly and coordinate go-to-market planning.\nEDUCATION\nExample University",
    expectedVerdicts: { react: "unknown", go: "unknown" }
  },
  {
    challenge: "alias",
    job: "We require CI/CD, GitHub Actions and testing experience.",
    resume: "Example Candidate\nSKILLS\nAutomated testing\nEXPERIENCE\nImplemented continuous integration and continuous delivery using GitHub workflows.\nEDUCATION\nExample University",
    expectedVerdicts: { "ci/cd": "supported", "github actions": "supported", testing: "supported" }
  },
  {
    challenge: "missing",
    job: "AWS is required and GCP experience is preferred.",
    resume: "Example Candidate\nSKILLS\nAWS\nEXPERIENCE\nUsed AWS to operate production services for three years.\nEDUCATION\nExample University",
    expectedVerdicts: { aws: "supported", gcp: "unknown" }
  },
  {
    challenge: "aspirational",
    job: "SQL is required. Python experience is preferred.",
    resume: "Example Candidate\nSUMMARY\nData analyst\nEXPERIENCE\nBuilt SQL reporting pipelines for 900 users. Completed introductory Python coursework.\nEDUCATION\nExample University",
    expectedVerdicts: { sql: "supported", python: "partial" }
  },
  {
    challenge: "alias",
    job: "Machine learning, PyTorch and vector search are required.",
    resume: "Example Candidate\nSUMMARY\nML engineer\nEXPERIENCE\nDeveloped machine learning models with PyTorch and implemented pgvector semantic search.\nEDUCATION\nExample University",
    expectedVerdicts: { "machine learning": "supported", pytorch: "supported", "vector search": "supported" }
  },
  {
    challenge: "exact",
    job: "The position requires Next.js, REST API and accessibility experience.",
    resume: "Example Candidate\nSUMMARY\nFrontend engineer\nEXPERIENCE\nDeveloped accessible NextJS interfaces and designed RESTful APIs for customer products.\nEDUCATION\nExample University",
    expectedVerdicts: { "next.js": "supported", "rest api": "supported", accessibility: "supported" }
  }
];

export function generateBenchmarkDataset(size = 120): BenchmarkCase[] {
  return Array.from({ length: size }, (_, index) => {
    const fixture = FIXTURES[index % FIXTURES.length];
    return {
      ...fixture,
      id: `adversarial-${index + 1}`,
      resume: fixture.resume.replace("Example Candidate", `Synthetic Candidate ${index + 1}`),
      expectedVerdicts: { ...fixture.expectedVerdicts }
    };
  });
}

function verdictMap(result: ReturnType<typeof analyzeResume>) {
  return Object.fromEntries((result.requirementAssessments ?? []).map((assessment) => [assessment.skill, assessment.verdict]));
}

export function runEvaluation(size = 120) {
  const dataset = generateBenchmarkDataset(size);
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  let correctVerdicts = 0;
  let totalVerdicts = 0;
  let negationCases = 0;
  let negationFalsePositives = 0;
  let aspirationalCases = 0;
  let aspirationalFalsePositives = 0;
  let abstentions = 0;
  let evidenceRequired = 0;
  let evidencePresent = 0;
  let consistent = 0;
  let formatConsistent = 0;
  let confidenceTotal = 0;
  let brierTotal = 0;
  const started = performance.now();

  for (const item of dataset) {
    const result = analyzeResume(item.job, item.resume);
    const predicted = verdictMap(result);
    for (const [skill, expected] of Object.entries(item.expectedVerdicts)) {
      const actual = predicted[skill] ?? "unknown";
      const correct = actual === expected;
      totalVerdicts += 1;
      if (correct) correctVerdicts += 1;
      if (expected === "supported" && actual === "supported") truePositive += 1;
      if (expected !== "supported" && actual === "supported") falsePositive += 1;
      if (expected === "supported" && actual !== "supported") falseNegative += 1;
      if (expected === "contradicted") {
        negationCases += 1;
        if (actual === "supported") negationFalsePositives += 1;
      }
      if (expected === "partial") {
        aspirationalCases += 1;
        if (actual === "supported") aspirationalFalsePositives += 1;
      }
      if (actual === "unknown") abstentions += 1;
      const assessment = result.requirementAssessments?.find((candidate) => candidate.skill === skill);
      if (actual !== "unknown") {
        evidenceRequired += 1;
        if (assessment?.evidence?.text) evidencePresent += 1;
      }
      const confidence = assessment?.confidence ?? 0;
      confidenceTotal += confidence;
      brierTotal += (confidence - (correct ? 1 : 0)) ** 2;
    }

    const counterfactual = analyzeResume(item.job, item.resume.replace(/^Synthetic Candidate \d+/, "Different Example Name"));
    if (JSON.stringify(verdictMap(counterfactual)) === JSON.stringify(predicted)) consistent += 1;
    const reformatted = analyzeResume(item.job, item.resume.replace(/\n/g, "\n\n"));
    if (JSON.stringify(verdictMap(reformatted)) === JSON.stringify(predicted)) formatConsistent += 1;
  }

  const precision = truePositive / Math.max(1, truePositive + falsePositive);
  const recall = truePositive / Math.max(1, truePositive + falseNegative);
  const f1 = 2 * precision * recall / Math.max(Number.EPSILON, precision + recall);
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return {
    engineVersion: ENGINE_VERSION,
    datasetSize: dataset.length,
    metrics: {
      precision: round(precision),
      recall: round(recall),
      f1: round(f1),
      contextualAccuracy: round(correctVerdicts / Math.max(1, totalVerdicts)),
      negationFalsePositiveRate: round(negationFalsePositives / Math.max(1, negationCases)),
      aspirationalFalsePositiveRate: round(aspirationalFalsePositives / Math.max(1, aspirationalCases)),
      abstentionRate: round(abstentions / Math.max(1, totalVerdicts)),
      evidenceCoverage: round(evidencePresent / Math.max(1, evidenceRequired)),
      counterfactualConsistency: round(consistent / dataset.length),
      formatConsistency: round(formatConsistent / dataset.length),
      averageConfidence: round(confidenceTotal / Math.max(1, totalVerdicts)),
      brierScore: round(brierTotal / Math.max(1, totalVerdicts)),
      averageLatencyMs: Math.round(((performance.now() - started) / dataset.length) * 100) / 100
    }
  };
}
