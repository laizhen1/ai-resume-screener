import { expect, test } from "@playwright/test";

test("guided example shows four evidence states and clears stale results", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Load guided example" }).click();
  await page.getByRole("button", { name: "Analyse match" }).click();
  await expect(page.getByRole("heading", { name: "Match analysis", exact: true })).toBeVisible();
  for (const [skill, verdict] of [["python", "supported"], ["docker", "partial"], ["kubernetes", "contradicted"], ["terraform", "unknown"]]) {
    await expect(page.locator(`.requirement-card.verdict-${verdict}`).filter({ has: page.locator("strong", { hasText: skill }) })).toHaveCount(1);
  }
  await page.screenshot({ path: "test-results/evidence-demo-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/evidence-demo-mobile.png", fullPage: true });
  await page.getByRole("textbox", { name: "Resume text", exact: true }).fill("Changed document");
  await expect(page.getByRole("heading", { name: "Match analysis", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Analyse match" })).toBeDisabled();
});

test("loading the demo replaces a file and analysis locks the input snapshot", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({ name: "example.txt", mimeType: "text/plain", buffer: Buffer.from("Fictional uploaded document") });
  await page.getByRole("button", { name: "Load guided example" }).click();
  expect(await page.locator('input[type="file"]').evaluate((input: HTMLInputElement) => input.files?.length)).toBe(0);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/analyze", async route => { await pending; await route.fulfill({ status: 503, json: { error: "Demo service temporarily unavailable." } }); });
  await page.getByRole("button", { name: "Analyse match" }).click();
  await expect(page.getByRole("textbox", { name: "Job description", exact: true })).toBeDisabled();
  await expect(page.getByRole("textbox", { name: "Resume text", exact: true })).toBeDisabled();
  release();
  await expect(page.locator("main").getByRole("alert")).toContainText("temporarily unavailable");
  await expect(page.getByRole("textbox", { name: "Resume text", exact: true })).toBeEnabled();
});

test("a slow analysis can be cancelled without rendering a stale result", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/analyze", async route => { await pending; await route.abort(); });
  await page.goto("/");
  await page.getByRole("button", { name: "Load guided example" }).click();
  await page.getByRole("button", { name: "Analyse match" }).click();
  await page.getByRole("button", { name: "Cancel analysis" }).click();
  release();
  await expect(page.getByRole("textbox", { name: "Resume text", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Analyse match" })).toBeEnabled();
  await expect(page.getByRole("heading", { name: "Match analysis", exact: true })).toHaveCount(0);
});
