#!/usr/bin/env node
/**
 * verify-release.mjs
 * Checks that forbidden release artifacts are not present in the project directory.
 *
 * Usage:
 *   node scripts/verify-release.mjs           # standard check (node_modules allowed)
 *   node scripts/verify-release.mjs --strict  # strict check (node_modules also forbidden)
 *
 * npm scripts:
 *   npm run verify:release-package         → standard
 *   npm run verify:release-package:strict  → strict
 *   npm run verify:package                 → clean + standard (safe to re-run)
 */

import fs from "node:fs";

const strict = process.argv.includes("--strict");

// Always forbidden — should never appear in a packaged release.
const forbidden = [
  "dist",
  "test-results",
  "playwright-report",
  "zip-test",
];

// Additionally forbidden in strict mode (node_modules expected during dev).
const strictForbidden = [
  "node_modules",
];

let failed = false;

const allForbidden = strict ? [...forbidden, ...strictForbidden] : forbidden;

for (const item of allForbidden) {
  if (fs.existsSync(item)) {
    console.error(`[verify-release] FAIL: Forbidden release artifact present: ${item}`);
    failed = true;
  }
}

// Scan for any nested ZIP files that shouldn't be committed
const topLevel = fs.readdirSync(".");
for (const entry of topLevel) {
  if (entry.endsWith(".zip") && entry !== ".gitignore") {
    console.error(`[verify-release] FAIL: ZIP file found in project root: ${entry}`);
    failed = true;
  }
}

const mode = strict ? "STRICT" : "standard";
if (failed) {
  console.error(`[verify-release] Release artifact check FAILED (${mode}). Clean the above before packaging.`);
  process.exit(1);
}

console.log(`[verify-release] Release artifact check PASSED (${mode}).`);
