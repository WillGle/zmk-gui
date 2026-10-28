# ZMK GUI — local fork

Independent UI work for Curve E, based on ZMK Studio.

- Upstream: https://github.com/zmkfirmware/zmk-studio
- Starting commit: `1bb6bb84a370c8917d8e4db15207087b26b3a844`
- Local development branch: `curve-ui`
- License: Apache-2.0; keep upstream LICENSE, NOTICE and per-file attribution.
- Scope: VIA-like key mapping UX using the existing Studio protocol.
- Firmware remains in the separate `zmk-curve-e` repository. Do not change BLE, flash firmware, or add dongle/ESB functionality here.

## Local development

```sh
npm ci
npm run dev
npm run build
```

Upstream currently fetches GitHub release metadata before dev/build; network
access is required for that step. Vite serves the web application; build output
is `dist/`. Desktop Tauri packaging is separate and not required for web hosting.
Web Serial requires a supported browser, a secure context (HTTPS or localhost),
OS serial permissions and an explicit user port selection.

No remote fork has been created and no Vercel deployment has been published.
The first key-selection and binding-picker UI iteration is implemented locally.
Live device save/reconnect validation is still pending.

## Vercel hosting

`vercel.json` configures a static Vite deployment: install with `npm ci`, build
with `npm run build`, and serve `dist/`. No backend or Tauri build is needed.
Both `/` (keymap editor) and `/download.html` (upstream desktop downloads) are
generated; the download page lists upstream ZMK Studio releases, not this fork.

When ready to publish:

1. Create your own GitHub repository and push the intended fork changes there.
   Keep upstream LICENSE, NOTICE and attribution.
2. Import that repository into Vercel. Use the repository root as Root Directory
   and select Node.js **22.x** in Project Settings to match local validation.
   The build/install/output settings come from `vercel.json`.
3. The build fetches public release metadata from GitHub. If GitHub rejects it
   due to rate limits, configure a build environment variable `GITHUB_TOKEN`
   with access to public release metadata. It is optional for normal builds;
   never prefix it with `VITE_` or put it in client code or version control.
4. After deployment, open the HTTPS URL in a browser supporting Web Serial
   (Chrome/Edge for USB). Device selection requires a user gesture and browser
   permission on the new origin; a new preview domain may need permission again.
   OS serial permissions still apply. Close other clients using the Studio port.
5. Verify connection and layout reading first. Saving to a real device remains
   an explicit user action. BLE availability remains dependent on the browser,
   OS and existing client support; hosting does not establish BLE reliability.

Local preparation does not publish the site. Remote fork creation, push,
Vercel account linking and deployment have not been performed. Cloud build,
deployed HTTPS behavior and real-device acceptance remain unverified until an
actual deployment is authorized and exercised.

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
