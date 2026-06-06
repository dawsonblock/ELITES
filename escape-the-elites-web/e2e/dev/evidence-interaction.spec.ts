import { test, expect } from "@playwright/test";
import { waitForTestHooks } from "./helpers";

test.setTimeout(30000);

test("player can collect evidence through real keypress interaction", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas.visible")).toBeVisible();
  await waitForTestHooks(page);

  // Load dock scene (default) and place player directly in front of service_map_001
  await page.evaluate(() => (window as any).__ETE_TEST__.loadScene("dock"));
  await page.waitForFunction(() => (window as any).__ETE_TEST__.getState().sceneId === "dock");

  // Place player near the evidence item using the helper
  await page.evaluate(() => (window as any).__ETE_TEST__.placePlayerNear("service_map_001"));
  // Give PlayCanvas one render cycle to update raycast
  await page.waitForTimeout(150);

  // Verify item is present before interaction
  const presentBefore = await page.evaluate(() =>
    (window as any).__ETE_TEST__.isInteractablePresent("service_map_001")
  );
  expect(presentBefore).toBe(true);

  // Press interact key
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(100);

  // Verify evidence was collected
  const collected = await page.evaluate(() =>
    (window as any).__ETE_TEST__.hasEvidence("service_map_001")
  );
  expect(collected).toBe(true);

  // Verify interactable prop was removed from scene
  const presentAfter = await page.evaluate(() =>
    (window as any).__ETE_TEST__.isInteractablePresent("service_map_001")
  );
  expect(presentAfter).toBe(false);
});

test("evidence board reflects collected evidence", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas.visible")).toBeVisible();
  await waitForTestHooks(page);

  // Collect an evidence item via hook
  await page.evaluate(() => (window as any).__ETE_TEST__.collectEvidence("guest_log_001"));

  // Open evidence board with Tab key
  await page.keyboard.press("Tab");
  await expect(page.getByText(/Private Guest Arrival Log/i)).toBeVisible({ timeout: 5000 });
});
