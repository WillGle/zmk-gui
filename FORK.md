# ZMK GUI — local fork

Web keymap editor for Curve E, based on ZMK Studio.

- Upstream: https://github.com/zmkfirmware/zmk-studio
- Starting commit: `1bb6bb84a370c8917d8e4db15207087b26b3a844`
- Initial development branch: `curve-ui`; current working branch: `main`
- License: Apache-2.0; keep upstream LICENSE, NOTICE and per-file attribution.
- Scope: VIA-like key mapping UX using the existing Studio protocol.
- Firmware remains in the separate `zmk-curve-e` repository. Do not change BLE, flash firmware, or add dongle/ESB functionality here.

## Local development

```sh
npm ci
npm run dev
npm run build
```

Vite serves the web application; build output is `dist/`. Development and build
no longer fetch upstream release metadata. Package installation still needs the
npm registry or an existing package cache.
Web Serial requires a supported browser, a secure context (HTTPS or localhost),
OS serial permissions and an explicit user port selection. Existing web BLE
support is retained, including its Linux browser restriction.

The fork remote is https://github.com/WillGle/zmk-gui. Vercel deployment and
live device save/reconnect acceptance have not been verified in this session.

## Vercel hosting

`vercel.json` configures a static Vite deployment: install with `npm ci`, build
with `npm run build`, and serve `dist/`. No backend or Tauri build is needed.
Only `/` (the keymap editor) is generated; the desktop download page is removed.

When ready to publish:

1. Push the intended changes to your fork when authorized. Keep upstream
   LICENSE, NOTICE and attribution.
2. Import the fork repository into Vercel. Use the repository root as Root
   Directory and select Node.js **22.x** in Project Settings to match local
   validation. Build/install/output settings come from `vercel.json`.
3. No GitHub release token, Apple/Azure signing credentials or Netlify webhook
   is needed for this web build.
4. After deployment, open the HTTPS URL in a browser supporting Web Serial
   (Chrome/Edge for USB). Device selection requires a user gesture and browser
   permission on the new origin; a new preview domain may need permission again.
   OS serial permissions still apply. Close other clients using the Studio port.
5. Verify connection and layout reading first. Saving to a real device remains
   an explicit user action. BLE availability remains dependent on the browser,
   OS and existing client support; hosting does not establish BLE reliability.

Local preparation does not publish the site. No commit, push, Vercel account
linking or deployment is performed by this cleanup. Cloud build, deployed HTTPS
behavior and real-device acceptance remain unverified here.

## GitHub Actions

The web-only fork uses one workflow, `.github/workflows/web-build.yml`:

- Runs on pushes, pull requests and manual dispatch, using Ubuntu 24.04 and
  Node 22 with the npm download cache.
- Runs `npm ci`, then `npm run build` (TypeScript checking and Vite bundling).
- Cancels an older run for the same branch or pull request when updated, with
  a 15-minute job limit.
- Uploads successful output as the `curve-e-web` artifact, containing `dist/`,
  LICENSE and NOTICE, retained for seven days. This is a downloadable build,
  not a deployment or firmware image.
- Has read-only repository permissions and requires no custom secrets.

Lint is not a required CI gate yet because the inherited lint errors documented
below remain unresolved. No tests were added. Vercel deployments are handled by
the Vercel Git integration when configured; no Actions deployment, release,
signing or firmware jobs are included.

Local validation: workflow YAML/configuration checks and `npm run build` passed;
artifact inputs exist. The bundle-size warning remains. GitHub runner execution
and artifact upload are not yet verified; these changes have not been pushed.

## Web-only cleanup — 2026-10-28

- Removed Tauri native source, desktop transport adapters, signing configuration
  and dependencies, desktop downloads and release-metadata generation.
- Replaced upstream desktop/release/Netlify workflows with `web-build.yml`:
  Node 22, `npm ci`, `npm run build`, read-only repository permissions; triggered
  by pushes, pull requests or manual dispatch. No release or deployment steps.
- Retained the Studio client/protocol, browser USB/BLE transports, firmware-driven
  layout/layers, UI editing, Storybook demos and Vercel static hosting config.
- Curve E is the intended device; no board-name gate, fixed geometry, layer count
  or serial port was introduced. No firmware changes or real-device writes.
- LICENSE, NOTICE, contributor attribution and upstream acknowledgements remain.
- `run-script-os` is retained because the Studio client requires it during
  postinstall; the core client package and version are unchanged.
- Removed 17 package-lock entries without changing retained package versions.

### Cleanup verification

- Clean `npm ci` passed with lifecycle scripts enabled. An initial offline
  attempt lacked cached packages; a clean install also caught the Studio
  client's `run-script-os` requirement, which was restored before verification.
- `npm run build` passed without release metadata or build-time network access.
  The existing bundle-size warning remains; no desktop download is emitted.
- Chromium production preview with mocked browser device selectors: USB and
  BLE each requested once after their button was pressed, no download links,
  unsupported-browser guidance visible, and no page errors. No real device used.
- The new workflow YAML parsed locally; GitHub-hosted CI has not run this change.
- ESLint still fails on inherited issues: 83 errors / 20 warnings, versus
  120 errors / 22 warnings at HEAD. No new diagnostic signatures were found.
- Core client lock entry and App connection/RPC/state/Save implementation match
  HEAD. No changes to keyboard/binding/RPC/undo-redo modules, LICENSE or NOTICE.
- No maintained tests added, firmware edits, device writes, commit, push or
  deployment performed. Existing remote workflows change only after a push.

## Historical hosting verification (before web-only cleanup)

Local hosting preparation verified on 2026-10-28 with Node v22.22.2 and npm
10.9.7: the full `npm run build` passed, including the live GitHub metadata
fetch, TypeScript and Vite. `dist/index.html`, `dist/download.html` and the logo
asset were checked. The inherited bundle-size warning remains. This later run
resolved the local build/DNS blocker recorded in the UI iteration below; it is
not a Vercel cloud-build result.

## Initial verification

- `npm ci`: completed against the upstream lockfile, without dependency upgrades.
- `npm run build`: TypeScript and Vite production build passed; static output in `dist/`.
- npm reported 39 dependency vulnerabilities (1 low, 16 moderate, 17 high,
  5 critical). This is an inherited dependency audit result, not an assessment
  of browser exploitability. Review before public deployment; no automatic
  `npm audit fix --force` was applied.
- Vite reported a chunk above 500 kB. No UI changes or device tests performed yet.

## Keymap UI iteration — 2026-10-28

- Keep physical key positions, rotations, binding metadata and layer counts from
  firmware; no Curve E layout or serial port is hard-coded.
- Selected keys use a persistent highlight, hover changes the surface without
  enlarging the key, and keyboard focus has its own outline. Keys expose selection
  and position labels to assistive technology.
- Show the current layer and selected key beside the binding editor. On narrow
  screens, place layout/layer controls above the keyboard. Manual zoom can scroll.
- Search binding types by name, grouped using firmware metadata into keys/media,
  layers and other behaviors. Search key/media names in the existing React Aria
  picker; modifiers and keyboard navigation remain available.
- Show connection/save status, a visible Save label, progress and retryable Save
  errors. Save remains explicit and is disabled while saving or locked.
- Protocol behavior is unchanged: choosing a valid binding sends a temporary
  device change; Save persists changes. This is not an offline editor. No device
  was connected or written during this development session.
- UI copy remains English to match upstream. No new combo/macro/hold-tap editing
  support is claimed.

### Verification for this iteration

- `npx tsc --noEmit`: passed.
- `npx vite build`: passed using existing local release metadata; the inherited
  chunk-size warning remains.
- Initial `npm run build` attempt: blocked before compilation by DNS failure
  (`EAI_AGAIN` for `api.github.com`) in `generate-data`; the later hosting
  preparation run above passed with network access. Metadata generation was
  not changed.
- ESLint: 120 errors / 22 warnings; the same check on a disposable copy of the
  starting commit reported 121 errors / 22 warnings. No new diagnostic signatures
  were found. Existing lint debt was left outside this UI change.
- Chromium with existing Storybook demos: key focus/Enter, binding-type search
  including no matches, and key/media search (`volume`, five matching options).
  At 150% zoom in a 326 px scroll viewport, the last key could be scrolled into
  view and clicked.
- Chromium with a disposable in-memory RPC mock: key selection, binding change,
  layer switching, unsaved status, Save failure and successful retry; desktop and
  390 px viewport inspected. The mock was removed; no maintained tests or demo
  fixtures were added.
- Real Curve E geometry rendering, OS port permissions, USB/BLE connection,
  persistent device Save and reconnect still require board/browser acceptance.
  Mock success does not establish firmware or BLE reliability.
