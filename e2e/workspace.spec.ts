import { expect, test } from "@playwright/test";

test("creates a job and opens the review workspace", async ({ page }) => {
  await page.goto("/workspace");
  await expect(page.getByRole("heading", { name: "Jobs, evidence and decisions." })).toBeVisible();
  const createResponse = page.waitForResponse((response) => response.url().endsWith("/api/workspace/jobs") && response.request().method() === "POST");
  await page.getByRole("button", { name: /Create job/ }).click();
  expect((await createResponse).ok()).toBe(true);
  await expect(page.getByText("Software Engineer", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("No candidates")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: "fictional-candidate.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Example Candidate\nSUMMARY\nSoftware engineer\nSKILLS\nTypeScript, React, PostgreSQL, Docker\nEXPERIENCE\nBuilt a reliable platform for 1,200 users and improved latency by 35%.\nEDUCATION\nExample University")
  });
  const uploadResponse = page.waitForResponse((response) => response.url().includes("/candidates") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Upload and analyse" }).click();
  expect((await uploadResponse).ok()).toBe(true);
  await expect(page.getByRole("heading", { name: "Example Candidate" })).toBeVisible();
  await expect(page.getByText("Inspect evidence")).toBeVisible();
});

test("runs and displays an evaluation", async ({ page }) => {
  await page.goto("/evaluation");
  const evaluationResponse = page.waitForResponse((response) => response.url().endsWith("/api/workspace/evaluations") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Run benchmark" }).click();
  expect((await evaluationResponse).ok()).toBe(true);
  await expect(page.getByText("Evaluation history")).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
});
