import { test, expect } from "@playwright/test";

test("loads main menu", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Escape the Elites/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Start/i })).toBeVisible();
});

test("game starts and canvas appears", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas")).toBeVisible();
});

test("pause menu opens", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await page.waitForTimeout(500);
  await page.keyboard.press("Escape");
  await expect(page.getByText(/Resume/i)).toBeVisible();
});

test("settings panel opens from main menu", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Settings/i }).click();
  await expect(page.getByText(/Mouse Sensitivity/i)).toBeVisible();
});
