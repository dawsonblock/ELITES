import { test, expect } from "@playwright/test";
import { waitForTestHooks } from "./helpers";

test("save and load manual slot through UI", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas")).toBeVisible();
  await waitForTestHooks(page);

  // Collect evidence and change scene via hook
  await page.evaluate(() => (window as any).__ETE_TEST__.collectEvidence("staff_keycard_001"));
  await page.evaluate(() => (window as any).__ETE_TEST__.loadScene("service_entrance"));
  await page.waitForFunction(() => (window as any).__ETE_TEST__.getState().sceneId === "service_entrance");

  // Open pause menu and save to manual slot
  await page.keyboard.press("Escape");
  await expect(page.getByText(/Paused/i)).toBeVisible();
  await page.getByRole("button", { name: /Save \/ Load/i }).click();
  const manualSlot1Row = page.locator(".pause-slot-row").filter({ hasText: /Manual Slot 1/ });
  await manualSlot1Row.getByRole("button", { name: /Save/i }).click();
  await expect(manualSlot1Row.locator(".saved")).toBeVisible();

  // Reload and start new game
  await page.reload();
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas")).toBeVisible();
  await waitForTestHooks(page);

  // Load manual save through pause menu
  await page.keyboard.press("Escape");
  await expect(page.getByText(/Paused/i)).toBeVisible();
  await page.getByRole("button", { name: /Save \/ Load/i }).click();
  await page.locator(".pause-slot-row").filter({ hasText: /Manual Slot 1/ }).getByRole("button", { name: /Load/i }).click();
  await page.waitForFunction(() => (window as any).__ETE_TEST__.getState().sceneId === "service_entrance");

  // Verify state restored
  const state = await page.evaluate(() => (window as any).__ETE_TEST__.getState());
  expect(state.evidence).toContain("staff_keycard_001");
  expect(state.sceneId).toBe("service_entrance");
});

test("ending via broadcast terminal UI", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas")).toBeVisible();
  await waitForTestHooks(page);

  // Use hooks to collect required evidence for broadcast
  await page.evaluate(() => (window as any).__ETE_TEST__.collectEvidence("server_archive_001"));
  await page.evaluate(() => (window as any).__ETE_TEST__.collectEvidence("broadcast_key_001"));
  await page.evaluate(() => (window as any).__ETE_TEST__.completeObjective("obj_reach_broadcast_tower"));

  // Load broadcast tower and teleport near terminal
  await page.evaluate(() => (window as any).__ETE_TEST__.loadScene("broadcast_tower"));
  await page.waitForFunction(() => (window as any).__ETE_TEST__.getState().sceneId === "broadcast_tower");
  await page.evaluate(() => (window as any).__ETE_TEST__.teleport([0, 1.7, -4], 180, 0));
  await page.waitForTimeout(100); // give PlayCanvas one render cycle to update raycast

  // Interact with broadcast terminal
  await page.keyboard.press("e");
  await expect(page.getByText("Broadcast Uplink Console")).toBeVisible();

  // Upload evidence archive
  await page.getByRole("button", { name: /Upload Evidence Archive/i }).click();

  // Verify ending screen appears
  await expect(page.getByText("BREAKING", { exact: true })).toBeVisible({ timeout: 8000 });
});
