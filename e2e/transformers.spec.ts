import { expect, test } from "@playwright/test";
import { analyzeResume } from "../lib/analyzer";

test("renders transformer evidence and cited Q&A on desktop and mobile", async ({ page }) => {
  const resume = "EXPERIENCE\nBuilt Python services for 200 users and maintained PostgreSQL databases for a customer platform.";
  const analysis = analyzeResume("The software engineer role requires Python experience.", resume);
  const evidence = analysis.requirementAssessments![0].evidence!;
  const probabilities = { entailment: 0.96, neutral: 0.02, contradiction: 0.02 };
  analysis.transformerEvidence = {
    status: "complete", warnings: [], baseline: [], entities: [],
    metadata: { version: "transformer-evidence-v1", models: { embedding: "sentence-transformers/all-MiniLM-L6-v2", reranker: "cross-encoder/ms-marco-MiniLM-L-6-v2", nli: "MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli", ner: null }, revisions: {}, packages: {}, device: "cpu", threshold: 0.8, margin: 0.15, topK: 8, rerankK: 3 },
    assessments: [{ ...analysis.requirementAssessments![0], method: "transformer-nli-v1", candidates: [{ passageId: 1, similarity: 0.7, rerankScore: 4, nli: probabilities, learningNli: { entailment: 0.02, neutral: 0.96, contradiction: 0.02 }, evidence }] }]
  };
  analysis.transformerEvidence.metadata!.models.evidence = "local/fine-tuned-evidence";
  analysis.transformerEvidence.metadata!.models.ner = "local/fine-tuned-ner";
  analysis.transformerEvidence.entities = [{ label: "SKILL", score: 0.95, evidence: { ...evidence, text: "Python", start: resume.indexOf("Python"), end: resume.indexOf("Python") + 6 } }];
  analysis.transformerEvidence.trainedEvidence = [{ skill: "python", passageId: 1, verdict: "unknown", abstained: true,
    probabilities: { supported: 0.4, partial: 0.3, contradicted: 0.1, unknown: 0.2 }, evidence }];
  await page.route("**/api/analyze", route => route.fulfill({ json: { analysis } }));
  await page.route("**/api/resume-qa", route => route.fulfill({ json: { answer: { status: "answered", message: "AI-generated answer with source citations.", claims: [{ text: "The resume describes Python services.", evidence }], warnings: [], model: "test-model" } } }));
  await page.goto("/");
  await page.getByLabel("Resume text", { exact: true }).fill(resume);
  await page.getByRole("button", { name: "Analyse match" }).click();
  await expect(page.getByRole("heading", { name: "Transformer evidence review" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fine-tuned evidence classifier" })).toBeVisible();
  await expect(page.getByText(/abstained below confidence threshold/)).toBeVisible();
  await expect(page.locator(".transformer-panel mark")).toHaveText("Python");
  await page.getByText("Inspect retrieved evidence", { exact: true }).click();
  await expect(page.getByText(/Reranker score: 4.000/)).toBeVisible();
  await page.getByLabel("Evidence question").fill("What backend experience is listed?");
  await page.getByRole("button", { name: "Ask about evidence" }).click();
  await expect(page.getByText("The resume describes Python services.")).toBeVisible();
  await expect(page.locator(".resume-qa blockquote")).toContainText("Built Python services");
  await page.locator(".transformer-panel").screenshot({ path: "test-results/transformer-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".transformer-panel")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator(".transformer-panel").screenshot({ path: "test-results/transformer-mobile.png" });
});
