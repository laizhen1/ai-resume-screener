import { performance } from "node:perf_hooks";
import { analyzeResume, ENGINE_VERSION } from "./analyzer";

type BenchmarkCase = { id: string; job: string; resume: string; expectedSkills: string[] };

const ROLE_FIXTURES = [
  { title: "Frontend Engineer", skills: ["typescript", "react", "next.js", "css", "testing"] },
  { title: "Backend Engineer", skills: ["node.js", "postgresql", "docker", "rest api", "redis"] },
  { title: "ML Engineer", skills: ["python", "pytorch", "machine learning", "docker", "vector search"] },
  { title: "Cloud Engineer", skills: ["aws", "terraform", "kubernetes", "ci/cd", "git"] },
  { title: "Data Analyst", skills: ["sql", "python", "data analysis", "gcp", "testing"] }
];

export function generateBenchmarkDataset(size = 120): BenchmarkCase[] {
  return Array.from({ length: size }, (_, index) => {
    const role = ROLE_FIXTURES[index % ROLE_FIXTURES.length];
    const supported = role.skills.filter((_, skillIndex) => (index + skillIndex) % 4 !== 0);
    return {
      id: `synthetic-${index + 1}`,
      job: `We are hiring a ${role.title}. Required experience includes ${role.skills.join(", ")}. Candidates collaborate with a delivery team and explain technical trade-offs.`,
      resume: `Synthetic Candidate ${index + 1}\nSUMMARY\n${role.title} focused on reliable delivery.\nSKILLS\n${supported.join(", ")}\nEXPERIENCE\nBuilt and delivered ${index + 2} projects for 1,200 users. Improved performance by ${20 + index % 50}%.\nEDUCATION\nExample University.`,
      expectedSkills: supported
    };
  });
}

export function runEvaluation(size = 120) {
  const dataset = generateBenchmarkDataset(size);
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  let consistent = 0;
  const started = performance.now();

  for (const item of dataset) {
    const result = analyzeResume(item.job, item.resume);
    const expected = new Set(item.expectedSkills);
    const actual = new Set(result.matchedSkills);
    actual.forEach((skill) => expected.has(skill) ? truePositive += 1 : falsePositive += 1);
    expected.forEach((skill) => { if (!actual.has(skill)) falseNegative += 1; });
    const counterfactual = analyzeResume(item.job, item.resume.replace(/^Synthetic Candidate \d+/, "Different Example Name"));
    if (counterfactual.overallScore === result.overallScore && counterfactual.matchedSkills.join() === result.matchedSkills.join()) consistent += 1;
  }

  const precision = truePositive / Math.max(1, truePositive + falsePositive);
  const recall = truePositive / Math.max(1, truePositive + falseNegative);
  const f1 = 2 * precision * recall / Math.max(Number.EPSILON, precision + recall);
  return {
    engineVersion: ENGINE_VERSION,
    datasetSize: dataset.length,
    metrics: {
      precision: Math.round(precision * 1000) / 1000,
      recall: Math.round(recall * 1000) / 1000,
      f1: Math.round(f1 * 1000) / 1000,
      counterfactualConsistency: Math.round((consistent / dataset.length) * 1000) / 1000,
      averageLatencyMs: Math.round(((performance.now() - started) / dataset.length) * 100) / 100
    }
  };
}
