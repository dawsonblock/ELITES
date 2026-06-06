import { test, expect } from "@playwright/test";
import { waitForTestHooks } from "./helpers";

test.setTimeout(60000);

/**
 * Broadcast sequence e2e tests.
 *
 * Covers the broadcast UI flow: checklist display, upload progress,
 * and sequence completion leading to the ending screen.
 */

test("broadcast sequence opens when triggerBroadcast is called", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas.visible")).toBeVisible();
  await waitForTestHooks(page);

  await page.evaluate(() => (window as any).__ETE_TEST__.triggerBroadcast());

  // Checklist panel should appear.
  await expect(page.locator(".broadcast-checklist-panel")).toBeVisible({ timeout: 3000 });
  await expect(page.getByText(/Evidence Summary/i)).toBeVisible();
});

test("broadcast checklist shows evidence items with correct state", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas.visible")).toBeVisible();
  await waitForTestHooks(page);

  // Collect one high-importance evidence item before triggering broadcast.
  await page.evaluate(() => (window as any).__ETE_TEST__.collectEvidence("server_archive_001"));

  await page.evaluate(() => (window as any).__ETE_TEST__.triggerBroadcast());
  await expect(page.locator(".broadcast-checklist-panel")).toBeVisible({ timeout: 3000 });

  // At least one checklist item should be in the "have" state.
  const haveItems = page.locator(".broadcast-item.broadcast-item-have");
  const haveCount = await haveItems.count();
  expect(haveCount).toBeGreaterThanOrEqual(1);
});

test("broadcast checklist shows 'Required' badges on required evidence", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas.visible")).toBeVisible();
  await waitForTestHooks(page);

  await page.evaluate(() => (window as any).__ETE_TEST__.triggerBroadcast());
  await expect(page.locator(".broadcast-checklist-panel")).toBeVisible({ timeout: 3000 });

  // Required evidence badges should be present in the checklist.
  const badgeCount = await page.locator(".broadcast-item-badge").count();
  expect(badgeCount).toBeGreaterThanOrEqual(1);
});

test("Initiate Broadcast button is disabled with no evidence", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas.visible")).toBeVisible();
  await waitForTestHooks(page);

  // Trigger broadcast with no evidence collected.
  await page.evaluate(() => (window as any).__ETE_TEST__.triggerBroadcast());
  await expect(page.locator(".broadcast-checklist-panel")).toBeVisible({ timeout: 3000 });

  const initiateBtn = page.getByRole("button", { name: /Initiate Broadcast/i });
  await expect(initiateBtn).toBeDisabled();
});

test("Initiate Broadcast button is enabled once minimum evidence collected", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas.visible")).toBeVisible();
  await waitForTestHooks(page);

  await page.evaluate(() => (window as any).__ETE_TEST__.collectEvidence("server_archive_001"));

  await page.evaluate(() => (window as any).__ETE_TEST__.triggerBroadcast());
  await expect(page.locator(".broadcast-checklist-panel")).toBeVisible({ timeout: 3000 });

  const initiateBtn = page.getByRole("button", { name: /Initiate Broadcast/i });
  await expect(initiateBtn).toBeEnabled();
});

test("broadcast upload progress panel appears after Initiate Broadcast", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas.visible")).toBeVisible();
  await waitForTestHooks(page);

  await page.evaluate(() => (window as any).__ETE_TEST__.collectEvidence("server_archive_001"));

  await page.evaluate(() => (window as any).__ETE_TEST__.triggerBroadcast());
  await expect(page.locator(".broadcast-checklist-panel")).toBeVisible({ timeout: 3000 });

  await page.getByRole("button", { name: /Initiate Broadcast/i }).click();

  // Upload panel replaces checklist.
  await expect(page.locator(".broadcast-upload-panel")).toBeVisible({ timeout: 3000 });
  await expect(page.getByText(/UPLINK ACTIVE/i)).toBeVisible();
});

test("broadcast upload percentage increments from 0", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas.visible")).toBeVisible();
  await waitForTestHooks(page);

  await page.evaluate(() => (window as any).__ETE_TEST__.collectEvidence("server_archive_001"));
  await page.evaluate(() => (window as any).__ETE_TEST__.triggerBroadcast());
  await expect(page.locator(".broadcast-checklist-panel")).toBeVisible({ timeout: 3000 });
  await page.getByRole("button", { name: /Initiate Broadcast/i }).click();
  await expect(page.locator(".broadcast-upload-panel")).toBeVisible({ timeout: 3000 });

  // After a short wait, percentage should have advanced above 0%.
  await page.waitForTimeout(1200);
  const pctText = await page.locator(".broadcast-upload-pct").textContent();
  const pct = parseInt(pctText ?? "0", 10);
  expect(pct).toBeGreaterThan(0);
});

test("full broadcast sequence leads to ending screen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas.visible")).toBeVisible();
  await waitForTestHooks(page);

  // Collect minimum evidence and all objectives to reach broadcast.
  await page.evaluate(() => {
    const ete = (window as any).__ETE_TEST__;
    ete.collectEvidence("server_archive_001");
    ete.collectEvidence("broadcast_key_001");
    ete.completeObjective("obj_reach_broadcast_tower");
    ete.completeObjective("obj_upload_broadcast");
    ete.loadScene("broadcast_tower");
  });
  await page.waitForFunction(
    () => (window as any).__ETE_TEST__.getState().sceneId === "broadcast_tower",
    { timeout: 5000 }
  );

  await page.evaluate(() => (window as any).__ETE_TEST__.triggerBroadcast());
  await expect(page.locator(".broadcast-checklist-panel")).toBeVisible({ timeout: 3000 });
  await page.getByRole("button", { name: /Initiate Broadcast/i }).click();

  // The upload takes ~7 s (14 log lines × 500ms). Allow up to 15 s for the
  // full sequence (upload + done stage timeout + onComplete call).
  await expect(page.getByText("BREAKING", { exact: true })).toBeVisible({ timeout: 20000 });
});

test("broadcast Abort button closes sequence without ending", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas.visible")).toBeVisible();
  await waitForTestHooks(page);

  await page.evaluate(() => (window as any).__ETE_TEST__.collectEvidence("server_archive_001"));
  await page.evaluate(() => (window as any).__ETE_TEST__.triggerBroadcast());
  await expect(page.locator(".broadcast-checklist-panel")).toBeVisible({ timeout: 3000 });

  await page.getByRole("button", { name: /Abort/i }).click();

  // Broadcast overlay should be gone and we should NOT be on the ending screen.
  await expect(page.locator(".broadcast-checklist-panel")).not.toBeVisible({ timeout: 2000 });
  await expect(page.getByText("BREAKING", { exact: true })).not.toBeVisible();
});
