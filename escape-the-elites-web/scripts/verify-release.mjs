#!/usr/bin/env node
/**
 * verify-release.mjs
 * Checks that forbidden release artifacts are not present in the project directory.
 * Run with: node scripts/verify-release.mjs
 */

import fs from "node:fs";

// These paths should not exist in a clean release package.
// node_modules is excluded from this check — it is expected during development
// but should be stripped before packaging (rm -rf node_modules && zip ...).
const forbidden = [
  "dist",
  "test-results",
  "playwright-report",
  "zip-test",
];

let failed = false;

for (const item of forbidden) {
  if (fs.existsSync(item)) {
    console.error(`[verify-release] FAIL: Forbidden release artifact present: ${item}`);
    failed = true;
  }
}

// Also scan for any nested ZIP files that shouldn't be committed
const topLevel = fs.readdirSync(".");
for (const entry of topLevel) {
  if (entry.endsWith(".zip") && entry !== ".gitignore") {
    console.error(`[verify-release] FAIL: ZIP file found in project root: ${entry}`);
    failed = true;
  }
}

if (failed) {
  console.error("[verify-release] Release artifact check FAILED. Clean the above before packaging.");
  process.exit(1);
}

console.log("[verify-release] Release artifact check PASSED.");
