import { test, expect } from "@playwright/test";

test("main menu loads in production build", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/ESCAPE THE ELITES/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Start/i })).toBeVisible();
});

test("game starts in production build", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas")).toBeVisible();
});

test("pause menu opens in production build", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText(/Paused/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Resume/i })).toBeVisible();
});

test("settings panel opens from main menu in production build", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Settings/i }).click();
  await expect(page.getByText(/Mouse Sensitivity/i)).toBeVisible();
});

test("production build does not expose dev test hooks", async ({ page }) => {
  await page.goto("/");
  const hasHooks = await page.evaluate(() => "__ETE_TEST__" in window);
  expect(hasHooks).toBe(false);
});
