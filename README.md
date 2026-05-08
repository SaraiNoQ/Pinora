# Pinora

Pinora is a browser new-tab bookmark dashboard built with Next.js static export and WebExtensions. It runs locally as a browser extension, so the navigation page opens instantly without a deployed web server.

The extension supports Chrome, Edge, and Firefox desktop. Firefox for Android can use the toolbar popup and internal extension pages, but it cannot replace the new-tab page because Firefox Android does not support `chrome_url_overrides`.

## Features

- Local new-tab bookmark dashboard for Chrome, Edge, and Firefox desktop.
- Toolbar popup for quickly saving the current page.
- Bookmark add, edit, delete, pin, and category assignment.
- Category add, rename, delete, custom icon URL, and drag sorting.
- Multi-engine search bar.
- Light and dark themes.
- JSON import and export for backup and migration.
- Browser extension storage with `storage.sync` or `storage.local`.
- Optional GitHub account cloud sync through Cloudflare Worker + D1.
- Manual cloud upload/pull plus scheduled upload checks.

## Tech Stack

- Next.js 15 static export
- React 19 + TypeScript
- Tailwind CSS
- Manifest V3 / WebExtensions
- `webextension-polyfill`
- Cloudflare Workers + D1 for optional account sync

## Project Structure

```text
pages/                 Next.js routes: new tab, settings, popup
components/            Reusable UI components
contexts/              Bookmark, category, and theme providers
lib/                   Storage, validation, and cloud sync helpers
data/                  Default bookmark/category data
types/                 Shared TypeScript interfaces
public/                Static assets, manifest, and background script
scripts/               Build helper scripts
sync-worker/           Optional Cloudflare Worker + D1 sync backend
out/                   Generated Chrome/Edge extension output
out-firefox/           Generated Firefox extension output
dist/                  Generated release artifacts
```

`out/`, `out-firefox/`, and `dist/` are generated directories and should not be edited or committed.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build the extension:

```bash
NEXT_PUBLIC_CLOUD_SYNC_API_BASE=https://bookmark-nav-sync.sarainosakura.workers.dev npm run build
```

## Load Locally

### Chrome / Edge

1. Run `npm run build`.
2. Open the browser extension management page.
3. Enable developer mode.
4. Load the `out/` directory as an unpacked extension.

### Firefox Desktop

Firefox requires a Firefox-compatible manifest variant:

```bash
NEXT_PUBLIC_CLOUD_SYNC_API_BASE=https://bookmark-nav-sync.sarainosakura.workers.dev npm run build
npm run extension:firefox
```

This generates `out-firefox/` and starts Firefox through `web-ext`.

## Build Scripts

```bash
npm run dev
npm run build
npm run lint
npm run extension:firefox:prepare
npm run extension:firefox
npm run extension:firefox:lint
npm run extension:firefox:package
npm run extension:firefox:sign
npm run sync-worker:typecheck
```

Important scripts:

- `extension:firefox:prepare` copies `out/` to `out-firefox/`, rewrites Firefox-specific manifest fields, raises the Firefox minimum version to `140.0`, and keeps AMO data collection declarations.
- `extension:firefox:lint` validates the Firefox package.
- `extension:firefox:package` builds a zip file in `dist/firefox/` for AMO listed submission.
- `extension:firefox:sign` signs an unlisted XPI using `AMO_JWT_ISSUER` and `AMO_JWT_SECRET`.

For public Firefox Add-ons listing, use `extension:firefox:package` and upload the zip from `dist/firefox/` in AMO Developer Hub.

The Firefox package declares `bookmarksInfo` and `authenticationInfo` in `data_collection_permissions`, because optional cloud sync can transmit saved bookmark data and GitHub authentication/session information to the configured Cloudflare Worker.

## Cloud Sync

Pinora works without any server. By default, data is stored in browser extension storage. Optional account cloud sync adds cross-browser and cross-device sync through a Cloudflare Worker backend.

Cloud sync stores a full navigation snapshot:

- bookmarks
- categories
- category icon URLs
- theme
- sync metadata

The GitHub OAuth session token is stored in `browser.storage.local`, not `browser.storage.sync`.

After cloud sync login, browser account sync is disabled by default and local data is stored in `storage.local`. This avoids `storage.sync` quota issues when icon URLs are long.

Cloud upload behavior:

- Local edits only mark data as pending upload.
- Clicking "Upload local data now" pushes immediately.
- Daily midnight sync checks for local changes and uploads only when the snapshot hash changed.
- Optional interval sync can check every 15 minutes, 30 minutes, 1 hour, 3 hours, 6 hours, or 12 hours.
- Pulling cloud data is always manual to avoid silent overwrites.

## Cloudflare Worker Setup

Create a D1 database, configure `sync-worker/wrangler.toml`, and set Worker secrets:

```bash
cd sync-worker
npm install
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put SESSION_SECRET
```

Create a GitHub OAuth App with callback URL:

```text
https://<worker-domain>/auth/github/callback
```

Run local checks:

```bash
npm run sync-worker:typecheck
cd sync-worker
npm run migrate:local
npm run dev
```

Deploy:

```bash
cd sync-worker
npm run migrate:remote
npm run deploy
```

Then rebuild the extension with the deployed Worker URL:

```bash
NEXT_PUBLIC_CLOUD_SYNC_API_BASE=https://<worker-domain> npm run build
```

Also update `public/manifest.json` `host_permissions` to the same Worker origin.

## Firefox Android Notes

Firefox for Android does not support `chrome_url_overrides`, so Pinora cannot replace the Android new-tab page. The mobile-compatible shape is:

- use the toolbar popup to save the current page;
- open the full dashboard as an internal extension page;
- rely on Cloudflare sync rather than Firefox Android account `storage.sync`, because Android does not sync that storage area through the Mozilla account.

If Android support is added as a release target, create an Android-specific package that removes `chrome_url_overrides` and adds `browser_specific_settings.gecko_android`.

## Data Limits

Bookmark icon URLs and category icon URLs may be normal URLs or `data:` URLs. Each icon URL is limited to 50KB. Larger values are rejected with a user-facing error.

## Security

- Do not commit Cloudflare, GitHub, AMO, or local environment secrets.
- Do not use `<all_urls>` in `host_permissions`; only allow the configured Worker origin.
- Do not introduce remote executable code, `eval`, or inline scripts.
- Extension assets should come from the packaged build or user-entered image/link URLs.
- Keep generated artifacts out of git.

## Release Checklist

Before publishing:

```bash
npm run lint
NEXT_PUBLIC_CLOUD_SYNC_API_BASE=https://bookmark-nav-sync.sarainosakura.workers.dev npm run build
npm run extension:firefox:lint
npm run sync-worker:typecheck
```

For Firefox public store upload:

```bash
NEXT_PUBLIC_CLOUD_SYNC_API_BASE=https://bookmark-nav-sync.sarainosakura.workers.dev npm run extension:firefox:package
```

Upload the generated zip from `dist/firefox/` to AMO as a listed extension.

Before every release, increment `public/manifest.json` `version`.

## Ignored Files

The repository ignores dependency folders, local env files, Next.js build output, extension build output, Firefox signing artifacts, Worker local state, and the old reference extension directory:

```text
.env*
.next/
node_modules/
out/
out-firefox/
dist/
web-ext-artifacts/
bookmark-extension/
sync-worker/.dev.vars
sync-worker/.wrangler/
```

`.env.example` and `sync-worker/.dev.vars.example` are safe templates and may be committed.
