import { test, expect } from "@playwright/test";
import { waitForTestHooks } from "./helpers";

test.setTimeout(60000);

test("terminal: unlock server console and download archive", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas")).toBeVisible();
  await waitForTestHooks(page);

  // Use hook to load bunker scene and teleport near terminal
  await page.evaluate(() => (window as any).__ETE_TEST__.loadScene("bunker_server_room"));
  await page.waitForFunction(() => (window as any).__ETE_TEST__.getState().sceneId === "bunker_server_room");
  await page.evaluate(() => (window as any).__ETE_TEST__.teleport([0, 1.7, -3], 180, 0));
  await page.waitForTimeout(100); // give PlayCanvas one render cycle to update raycast

  // Interact with terminal
  await page.keyboard.press("e");
  await expect(page.getByText("Server Archive Console")).toBeVisible();

  // Enter unlock code
  await page.getByPlaceholder("ENTER CODE").fill("7391");
  await page.getByRole("button", { name: /Unlock/i }).click();
  await expect(page.getByText("ACCESS GRANTED")).toBeVisible();

  // Run download command
  await page.getByRole("button", { name: /Download Encrypted Server Archive/i }).click();
  await expect(page.getByText(/Downloading archive/i)).toBeVisible();

  // Wait for download to complete (simulated ~25 seconds)
  await expect(page.getByText("DOWNLOAD COMPLETE")).toBeVisible({ timeout: 30000 });

  // Verify evidence collected
  const state = await page.evaluate(() => (window as any).__ETE_TEST__.getState());
  expect(state.evidence).toContain("server_archive_001");
});
