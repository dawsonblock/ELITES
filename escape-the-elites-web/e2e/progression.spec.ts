import { test, expect } from "@playwright/test";

async function waitForTestHooks(page: any) {
  await page.waitForFunction(() => !!(window as any).__ETE_TEST__, { timeout: 10000 });
  await page.waitForFunction(() => (window as any).__ETE_TEST__.isReady(), { timeout: 10000 });
}

test("full route: collect evidence and reach ending", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas.visible")).toBeVisible();
  await waitForTestHooks(page);

  // Collect service map in dock, then transition to service entrance
  await page.evaluate(() => (window as any).__ETE_TEST__.collectEvidence("service_map_001"));
  await page.evaluate(() => (window as any).__ETE_TEST__.completeObjective("obj_find_way_inside"));
  await page.evaluate(() => (window as any).__ETE_TEST__.loadScene("service_entrance"));

  // Collect keycard, unlock maintenance door
  await page.evaluate(() => (window as any).__ETE_TEST__.collectEvidence("staff_keycard_001"));
  await page.evaluate(() => (window as any).__ETE_TEST__.completeObjective("obj_enter_service_route"));
  await page.evaluate(() => (window as any).__ETE_TEST__.completeObjective("obj_unlock_maintenance_door"));
  await page.evaluate(() => (window as any).__ETE_TEST__.unlockDoor("maintenance_door"));
  await page.evaluate(() => (window as any).__ETE_TEST__.loadScene("mansion_office"));

  // Collect office evidence
  await page.evaluate(() => (window as any).__ETE_TEST__.collectEvidence("guest_log_001"));
  await page.evaluate(() => (window as any).__ETE_TEST__.collectEvidence("payment_note_001"));
  await page.evaluate(() => (window as any).__ETE_TEST__.completeObjective("obj_find_office_evidence"));
  await page.evaluate(() => (window as any).__ETE_TEST__.loadScene("security_wing"));

  // Collect bunker access evidence
  await page.evaluate(() => (window as any).__ETE_TEST__.collectEvidence("security_feed_002"));
  await page.evaluate(() => (window as any).__ETE_TEST__.completeObjective("obj_find_bunker_access"));
  await page.evaluate(() => (window as any).__ETE_TEST__.collectEvidence("access_log_001"));
  await page.evaluate(() => (window as any).__ETE_TEST__.completeObjective("obj_enter_bunker"));
  await page.evaluate(() => (window as any).__ETE_TEST__.unlockDoor("bunker_door"));
  await page.evaluate(() => (window as any).__ETE_TEST__.loadScene("bunker_server_room"));

  // Download server archive
  await page.evaluate(() => (window as any).__ETE_TEST__.collectEvidence("server_archive_001"));
  await page.evaluate(() => (window as any).__ETE_TEST__.completeObjective("obj_download_archive"));
  await page.evaluate(() => (window as any).__ETE_TEST__.completeObjective("obj_escape_lockdown"));

  // Reach broadcast tower and trigger ending
  await page.evaluate(() => (window as any).__ETE_TEST__.collectEvidence("broadcast_key_001"));
  await page.evaluate(() => (window as any).__ETE_TEST__.loadScene("broadcast_tower"));
  await page.evaluate(() => (window as any).__ETE_TEST__.completeObjective("obj_reach_broadcast_tower"));
  await page.evaluate(() => (window as any).__ETE_TEST__.completeObjective("obj_upload_broadcast"));
  await page.evaluate(() => (window as any).__ETE_TEST__.triggerBroadcast());

  // Verify ending screen appears (lazy-loaded chunk may need extra time on first load)
  await expect(page.getByText("BREAKING", { exact: true })).toBeVisible({ timeout: 8000 });
});

test("save and continue restores state after reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas.visible")).toBeVisible();
  await waitForTestHooks(page);

  // Collect some evidence and save
  await page.evaluate(() => (window as any).__ETE_TEST__.collectEvidence("staff_keycard_001"));
  await page.evaluate(() => (window as any).__ETE_TEST__.completeObjective("obj_find_way_inside"));
  await page.evaluate(() => (window as any).__ETE_TEST__.loadScene("service_entrance"));

  // Save via test hook before reload
  await page.evaluate(() => (window as any).__ETE_TEST__.saveToSlot("AutoSave"));

  const stateBefore = await page.evaluate(() => (window as any).__ETE_TEST__.getState());
  expect(stateBefore.evidence).toContain("staff_keycard_001");
  expect(stateBefore.objectives).toContain("obj_find_way_inside");
  expect(stateBefore.sceneId).toBe("service_entrance");

  // Reload page and continue
  await page.reload();
  await page.getByRole("button", { name: /Continue/i }).click();
  await expect(page.locator("canvas.game-canvas.visible")).toBeVisible({ timeout: 5000 });
  await waitForTestHooks(page);

  // Verify restored state
  const stateAfter = await page.evaluate(() => (window as any).__ETE_TEST__.getState());
  expect(stateAfter.evidence).toContain("staff_keycard_001");
  expect(stateAfter.objectives).toContain("obj_find_way_inside");
  expect(stateAfter.sceneId).toBe("service_entrance");
});

test("best ending is reachable with full evidence", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start/i }).click();
  await expect(page.locator("canvas.game-canvas.visible")).toBeVisible();
  await waitForTestHooks(page);

  // Collect all evidence for best ending
  const allEvidence = [
    "service_map_001", "staff_keycard_001", "camera_note_001",
    "guest_log_001", "payment_note_001", "staff_memo_001",
    "security_feed_002", "access_log_001",
    "server_archive_001", "broadcast_key_001", "transport_manifest_001",
    "hidden_archive_001"
  ];
  for (const id of allEvidence) {
    await page.evaluate((evId: string) => (window as any).__ETE_TEST__.collectEvidence(evId), id);
  }

  // Complete all objectives
  const allObjectives = [
    "obj_find_way_inside", "obj_enter_service_route", "obj_unlock_maintenance_door",
    "obj_find_office_evidence", "obj_find_bunker_access", "obj_enter_bunker",
    "obj_download_archive", "obj_escape_lockdown", "obj_reach_broadcast_tower",
    "obj_upload_broadcast"
  ];
  for (const id of allObjectives) {
    await page.evaluate((objId: string) => (window as any).__ETE_TEST__.completeObjective(objId), id);
  }

  await page.evaluate(() => (window as any).__ETE_TEST__.loadScene("broadcast_tower"));
  await page.evaluate(() => (window as any).__ETE_TEST__.triggerBroadcast());

  await expect(page.getByText("BREAKING", { exact: true })).toBeVisible({ timeout: 8000 });
});
