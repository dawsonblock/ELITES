# Security Notes

Status: Alpha.

## Current npm audit status

`npm audit` reports 9 vulnerabilities (4 moderate, 4 high, 1 critical) as of Alpha 0.4.
`npm audit fix` makes no changes — all findings are locked in transitive dependency chains.

## Known vulnerability chains

### esbuild / vite (moderate)
```
esbuild <= 0.24.2
  vite <= 6.4.1
    vitest / vite-node / @vitest/mocker
```
**Finding:** esbuild dev server allows any website to read responses (GHSA-67mh-4wv8-2f99).
**Fix available:** `npm audit fix --force` would install vite@8, which is a breaking change.
**Assessment:** Dev-server only. Does not affect the production browser bundle. Zero runtime risk
for players. Risk is limited to developer machines running `npm run dev`.

### tar / @mapbox/node-pre-gyp / canvas / playcanvas (high)
```
tar <= 7.5.10
  @mapbox/node-pre-gyp <= 1.0.11
    canvas (optional native dependency)
      playcanvas 1.71.x
```
**Findings:** Multiple path traversal and symlink poisoning CVEs in `node-tar`.
**Assessment:** `canvas` is an optional native binary dependency that PlayCanvas lists for Node.js
server-side rendering. This project is a static browser game — `canvas` is never executed at
runtime in the browser. The vulnerable `tar` binary is used only during `npm install` to extract
native modules on the developer's machine. It is not bundled into the production build.

`npm audit --omit=dev` confirms 4 high findings, all in the PlayCanvas → canvas → tar chain.

## Production bundle assessment

The production build (`npm run build`) is a static browser bundle. No Node.js packages from
these chains (tar, canvas, node-pre-gyp) are included in the browser output. The production
e2e test suite includes a test that confirms `__ETE_TEST__` is absent (dev-only code is not
leaked), and a build-time check confirms no Node-only code paths are reachable.

## Required before public release

- [ ] Re-run `npm audit` and check if PlayCanvas has released a patch
- [ ] Attempt `npm audit fix --force` against a branch and verify nothing breaks
- [ ] Upgrade Vite/Vitest to eliminate esbuild dev-server finding
- [ ] Confirm production bundle does not include tar/canvas/node-pre-gyp code via `npm run build`
      and bundle analysis
- [ ] Document any accepted residual risk per-CVE
- [ ] Run full `npm run verify:full` after any dependency changes
