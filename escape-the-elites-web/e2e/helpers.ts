import type { Page } from "@playwright/test";

export async function waitForTestHooks(page: Page) {
  await page.waitForFunction(() => !!(window as any).__ETE_TEST__, { timeout: 10000 });
  await page.waitForFunction(() => (window as any).__ETE_TEST__.isReady(), { timeout: 10000 });
}
