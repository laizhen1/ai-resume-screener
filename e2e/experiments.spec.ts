import { expect, test } from "@playwright/test";

test("compares unique cases, inspects source evidence, and exports a reviewed candidate", async ({ page }) => {
  await page.goto("/evaluation");
  await page.getByRole("button", { name: "Run comparison", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pipeline comparison", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "24 unique examples - 24 executions" })).toBeVisible();
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
