import { expect, test } from "@playwright/test";
test("readiness can be checked before submitting a resume", async ({page})=>{
 await page.route("**/api/model-status",route=>route.fulfill({json:{status:"missing-model",model:"fixture-model",elapsedMs:8}}));
 await page.goto("/"); await page.getByRole("button",{name:"Check model readiness"}).click();
 await expect(page.getByRole("status",{name:"Model readiness"})).toContainText("fixture-model: missing-model");
});
