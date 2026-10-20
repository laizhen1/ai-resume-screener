import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("compares unique cases, inspects source evidence, and exports a reviewed candidate", async ({ page }) => {
  await page.goto("/evaluation");
  await page.getByRole("button", { name: "Run comparison", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pipeline comparison", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "24 unique examples - 24 executions" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Model categories + policy", exact: true })).toBeVisible();
  await expect(page.getByText("DIAGNOSTIC EVALUATION", { exact: true })).toBeVisible();
  await expect(page.getByText("not-run - 0 model / 0 fallback").first()).toBeVisible();
  await page.getByLabel("Failures only").uncheck();
  await page.getByRole("button", { name: "Inspect holdout-01", exact: true }).click();
  await expect(page.locator(".source-text mark")).toContainText("Python");
  await page.getByLabel("Reviewer verdict").selectOption("partial");
  await page.getByLabel("Reason", { exact: true }).fill("This example needs independent review of the delivery evidence.");
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  await expect(page.getByText("Review saved. Original labels and metrics are unchanged.")).toBeVisible();
  const artifact = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export run JSON" }).click();
  expect((await artifact).suggestedFilename()).toMatch(/^experiment-.*\.json$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Pipeline comparison", exact: true })).toBeVisible();
  await expect(page.getByText("This example needs independent review of the delivery evidence.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export review candidates" })).toBeEnabled();
});

test("runs and exports the separately labeled challenge set", async ({ page }) => {
  await page.goto("/evaluation");
  await page.getByLabel("Dataset split").selectOption("challenge");
  await page.getByRole("button", { name: "Run comparison", exact: true }).click();
  await expect(page.getByText("NEW CHALLENGE EVALUATION", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "24 unique examples - 24 executions" })).toBeVisible();
  await expect(page.getByText(/New agent-authored challenge frozen before live inference/)).toBeVisible();
  await page.getByLabel("Failures only").uncheck();
  await page.getByRole("button", { name: "Inspect fresh-01", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Evidence review - fresh-01" })).toBeVisible();
  const artifact = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export run JSON" }).click();
  expect((await artifact).suggestedFilename()).toMatch(/^experiment-.*\.json$/);
});
