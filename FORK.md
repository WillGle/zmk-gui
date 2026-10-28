# ZMK GUI — local fork

Web keymap editor based on ZMK Studio, primarily used with Curve E.
Other keyboards are supported when their firmware implements a compatible ZMK
Studio protocol over an available browser USB/BLE transport. Device capabilities,
layouts and layers come from firmware; no Curve E device restriction is applied.

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

The web-only fork uses `.github/workflows/web-build.yml`, triggered by pushes,
pull requests and manual dispatch on Ubuntu 24.04:

- Uses official `actions/checkout` 7.0.1, `actions/setup-node` 7.1.0 and
  `actions/upload-artifact` 7.0.2, pinned to full commit SHAs verified against
  their release tags on 2026-10-28. Comments identify the release versions.
  These actions use Node 24 internally; the application build remains Node 22
  to match local/Vercel configuration.
- Uses read-only repository permissions, does not persist checkout credentials,
  and caches npm downloads using `package-lock.json`.
- Runs `npm ci --no-audit`, then a separate `npm audit --audit-level=low`,
  `npm run lint`, `npm run build` (TypeScript and Vite), and
  `npm run build-storybook -- --disable-telemetry` with Storybook output in the
  runner's temporary directory. No maintained tests were added.
- Audit checks both application and development dependencies. Any reported
  advisory at low severity or higher fails the job. An unavailable npm audit
  service also fails the step; audit errors are not silently ignored.
- Cancels an older run for the same branch/pull request, with a 15-minute limit.
- Uploads `curve-e-web` only after all checks pass, containing `dist/`, LICENSE
  and NOTICE, retained for seven days. Storybook output is only validated;
  it is not included in the web artifact.

`.github/dependabot.yml` checks GitHub Actions updates weekly and groups them
into reviewable pull requests, including updates to SHA pins. It does not
configure npm updates or automatic merging. No custom secrets are required.

Vercel deployment remains handled by its Git integration when configured.
There are no Actions deployment, release, signing or firmware steps.

Local upgrade verification: official release/commit/action inputs verified,
checksum-verified actionlint 1.7.12 passed, workflow and Dependabot YAML/config
checks passed, and the install/audit/lint/web-build/Storybook commands passed
locally. npm audit reported zero vulnerabilities. Existing bundle-size warnings
remain. GitHub-hosted runner execution, Dependabot PR creation and artifact
upload remain unverified; these changes have not been pushed or deployed.

## Dependency and lint follow-up — 2026-10-28

Current local validation supersedes the older lint/audit counts in the historical
verification sections below: **npm audit: 0 advisories; ESLint: 0 errors and
0 warnings**, with all existing lint rules and `--max-warnings 0` retained.
This describes the registry advisory database at verification time, not a claim
that the application has no security defects.

- Updated affected transitive dependencies within existing supported ranges,
  including Babel, matching/glob utilities, YAML parsers and protobufjs.
  Studio client remains 0.0.18, Storybook 8.6.19 and Vite 6.4.5.
- Studio's `protobufjs` runtime is now 7.6.6, with `@protobufjs/utf8` 1.1.2,
  satisfying the client's existing `^7.3.2` dependency. Generated schemas,
  transport adapters and wire framing are unchanged.
- The only override is scoped to `@storybook/addon-actions` → `uuid ^11.1.1`.
  Storybook 8 requests uuid 9; its action handler uses the compatible `v4()` API.
  CommonJS loading and the static Storybook browser action were verified
  (a key click emitted an action with a valid UUID v4). Recheck/remove the
  override when upgrading Storybook to a version declaring a patched uuid.
- Repaired lint without disabling rules: safe `const` declarations, typed
  notification publication/subscription, complete hook dependency lists with
  stable device requests/mappers, and a separate layout-zoom utility.
- Binding changes emit from user input handlers, avoiding draft reapplication
  on parent renders. Modal cancellation uses `preventDefault()` with listener
  cleanup; changing cancel/outside-click options takes effect immediately.
- The web workflow now runs `npm run lint` before the production build.

Verification: clean `npm ci` with lifecycle scripts passed, `npm run lint`
passed, `npm run build` passed, and `npm run build-storybook -- --disable-telemetry`
passed. Browser probes against real source modules and a framed protobuf mock
passed 23 App checks plus UI binding/accessibility checks, and 14 additional
hook/draft/modal checks in React StrictMode. They confirmed no fetch loop on
unrelated renders, one reload after unlock, no binding echo on external updates,
and Escape/outside-click behavior. No browser page errors occurred. Independent
source review found no actionable regression in these scoped changes.

Disposable evidence is in `/tmp/zmk-dependency-lint/`; no maintained tests were
added. Existing large-bundle warnings and npm deprecation notices (including
upstream glob 10) remain separate from the zero-advisory result. Firmware,
hardware and device writes were not used. GitHub runner, Vercel deployment and
real-device acceptance remain unverified; no commit, push or deployment.

## Repository file cleanup — 2026-10-28

Reviewed tracked source, hidden configuration, assets, build/CI/Vercel entrypoints
and Storybook references. Retained the existing working-tree deletion of the
legacy `.devcontainer` (Fedora/Rust/Tauri setup and sibling firmware mount).
Removed eight additional orphaned files, totaling 917,702 bytes:

- `.pre-commit-config.yaml` and `requirements.txt`: optional upstream Python
  hook setup, not installed in this checkout or invoked by npm/CI. The npm
  Prettier package/configuration and CI lint gate remain.
- `public/zmk-mac.png`, `public/zmk-mac-app-icon.webp`, `public/vite.svg`:
  desktop artwork and Vite template logo with no remaining consumers.
- `src/assets/mode.svg`: unused alternative; About retains Mode's PNG logos.
- `src/misc/async.ts`: unused `valueAfter` helper.
- `src/react-extra.d.ts`: unused React CSS custom-property augmentation;
  TypeScript compilation succeeds without it.

Removed obsolete `src/data`/`dist-ssr` ignore entries and the empty Storybook MDX
search pattern. No package, lockfile, protocol, transport or keymap logic changed.
Storybook and its demos, formatter configuration, build/hosting configuration,
LICENSE, NOTICE, upstream changelog and displayed sponsor attribution remain.
The complete HID table is retained as the source of the filtered runtime table;
the documented filter was checked to reproduce the runtime data exactly.
Also removed the ignored `src/data/release-data.json` left by the retired
release-metadata generator (13,542 bytes); no current source/configuration reads
it. Local dependencies, current build output, setup logs and environment-owned
folders were retained.

Verification: all 46 remaining code files are reachable from web, Storybook,
configuration or ambient type entrypoints; 107 relative imports resolve.
`npm run lint`, `npm run build` and the Storybook build passed. Storybook still
contains all 28 entries. Removed public assets are absent from `dist/`, while the
ZMK logo and Inter font remain. Existing bundle-size warnings remain. Browser
production inspection passed app startup, all 14 About sponsor images in light
and dark mode, and NOTICE display, with zero page errors or failed HTTP
responses. It did not exercise USB/BLE or Save. No maintained tests, firmware/device
operations, commits, pushes or deployment were performed.

## Web-only cleanup — 2026-10-28

- Removed Tauri native source, desktop transport adapters, signing configuration
  and dependencies, desktop downloads and release-metadata generation.
- Replaced upstream desktop/release/Netlify workflows with `web-build.yml`:
  Node 22, `npm ci`, `npm run build`, read-only repository permissions; triggered
  by pushes, pull requests or manual dispatch. No release or deployment steps.
- Retained the Studio client/protocol, browser USB/BLE transports, firmware-driven
  layout/layers, UI editing, Storybook demos and Vercel static hosting config.
- Curve E is the primary device; other compatible Studio devices may also use
  the editor. No board-name gate, fixed geometry, layer count
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

## Earlier audit fixes — 2026-10-28

Implemented all 15 findings from the post-cleanup audit, following the explicit
request to fix them. The earlier cleanup verification above describes that
historical change only. This follow-up intentionally changes application RPC
scheduling, connection lifecycle and Undo/Redo; the Studio client remains
0.0.18 and its schemas, framing, browser transports and firmware are unchanged.

- **F01:** RPC requests serialize per connection and time out after five seconds.
  Abort cancels pending stream operations, releases locks and closes the session;
  an abandoned connection cannot block a new connection's handshake.
- **F02:** Updated Vite to 6.4.5, Storybook packages to 8.6.19 and the React SWC
  plugin to 3.11.0. The Vite/Storybook core advisories identified in the audit
  no longer appear in npm audit. No forced dependency repair was used.
- **F03/F04:** Undo/Redo actions serialize, commit history only after success and
  release the busy state after failure. Reset invalidates pending history work.
- **F05/F06:** Session boundaries clear history, pending state and unlock state.
  Discard/Reset refresh data only after successful responses for the current
  connection. Late responses cannot restore a disconnected session. Pending
  commands also reject mutation callbacks, including non-native drag controls.
- **F07:** Invalid constants/layer parameters show an explicit unselected option,
  instead of displaying a value that has not been applied.
- **F08:** Layer reordering accounts for before/after drop placement and removal
  of the source item.
- **F09:** Binding rejection shows an error, restores the picker to the applied
  binding and leaves history unchanged.
- **F10/F11:** Layer rename is a named button outside the layer list; parameter
  controls have distinct accessible names.
- **F12/F13:** Key labels fall back through long/medium/short names and include
  all eight modifier flags in both visible and accessible binding descriptions.
- **F14:** About and License actions use keyboard-operable buttons.
- **F15:** Physical-layout selection updates geometry and keymap together after
  ACK. Rejection retains the previous layout; Undo also waits for ACK.

### Verification and remaining limits

- `npm run build` passed with TypeScript and Vite. The existing chunk-size
  warning remains (main JavaScript about 806 kB, gzip 208 kB).
- Storybook production build and development startup passed; the development
  index contained 28 entries. Vite development HTTP/transform checks passed.
- Disposable Web Streams probes passed eight assertions covering RPC timeout,
  retry, serialization, firmware meta errors, abort, response mismatch, stream
  locks and unhandled rejections.
- Disposable Chromium probes using real React/source modules passed Undo/Redo
  concurrency, rejection, reset and StrictMode checks; parameter placeholders,
  modifier labels, keyboard rename/footer activation and layer drag checks.
  Source-derived reorder probes covered all 32 source/target/drop combinations.
- Full App in Chromium StrictMode used a framed protobuf transport fixture:
  failed handshake/retry, rejected/accepted binding, Undo across lock/unlock,
  unsaved status, Save failure/retry, rejected/accepted layout and layout Undo,
  failed Discard/Reset, pending mutation rejection, and late Discard/Reset
  followed by disconnect/reconnect passed. No browser page errors occurred.
- ESLint still exits nonzero: **40 errors / 8 warnings**, down from the audited
  83 / 20. Inherited lint debt remains; this is not a clean-lint claim.
- Fresh npm audit reports **19 package vulnerability entries**: 1 low,
  9 moderate, 8 high and 1 critical, down from 39. Remaining entries include
  protobufjs and transitive development dependencies; exploit reachability has
  not been established. Fixing F02 does not mean all dependencies are secure.
- Independent source review found two gaps in the initial fixes (mutations
  during pending commands and Undo after lock/unlock); both were repaired and
  covered by the final probes. No remaining blocker was found in that review.
- Probe scripts/logs are disposable files under `/tmp/zmk-fix-all/` and
  `/tmp/zmk-*.mjs`/`.cjs`, not maintained tests in the repository.
- No firmware edits, hardware access, device writes, commit, push or deployment.
  Real Curve E USB/BLE, persistent Save, sleep/reconnect, GitHub runner/artifact
  upload and Vercel HTTPS acceptance still require separate verification.

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
