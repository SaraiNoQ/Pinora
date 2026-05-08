# Repository Guidelines

## Project Structure & Module Organization

This repository is a Next.js static-export browser new-tab extension using TypeScript, React, Tailwind CSS, and Manifest V3. It is built as a local browser extension rather than a deployed website. Top-level directories are intentionally simple:

- `pages/` contains Next.js pages, including `_app.tsx`, the main `index.tsx` new-tab route, `settings.tsx` for extension settings, and `popup.tsx` for the toolbar quick-save popup.
- `components/` contains reusable UI components such as `BookmarkCard`, `BookmarkForm`, `SearchBar`, and modals.
- `contexts/` contains React Context providers for bookmarks and categories.
- `lib/` contains browser-extension-safe utilities, including the cross-browser storage wrapper, optional Cloudflare account sync client, storage status helpers, and bookmark validation.
- `data/` contains seed/default bookmark data, especially `data/bookmarks.ts`.
- `types/` contains shared TypeScript interfaces.
- `styles/` contains global CSS; Tailwind configuration lives in `tailwind.config.ts`.
- `public/` contains static assets and icons served from the site root.
- `public/manifest.json` is the extension entry manifest. It overrides the browser new-tab page with `index.html` and exposes `popup.html` through the toolbar action.
- `public/background.js` is the extension background script for scheduled Cloudflare sync checks.
- `scripts/prepare-firefox-extension.mjs` copies `out/` to `out-firefox/`, rewrites the background manifest entry for Firefox compatibility, raises Firefox minimum version to `140.0`, and preserves AMO data collection declarations.
- `sync-worker/` contains the optional Cloudflare Workers + D1 backend for GitHub account sync. It has its own `wrangler.toml`, migration files, and TypeScript config.
- `out/` is the generated Chrome/Edge static extension directory after `npm run build`; load this folder as the unpacked extension during manual testing. Do not edit it directly.
- `out-firefox/` is generated from `out/` for Firefox testing and packaging. Do not edit it directly.

## Build, Test, and Development Commands

Use npm with the committed `package-lock.json`:

- `npm install` installs project dependencies.
- `npm run dev` starts the local Next.js dev server on port `3000`.
- `npm run build` creates the static extension build in `out/` and runs Next.js type/build checks.
- `npm run extension:firefox` prepares `out-firefox/` and launches Firefox using `web-ext` after a successful build.
- `npm run extension:firefox:lint` prepares `out-firefox/` and validates the Firefox extension manifest.
- `npm run extension:firefox:sign` prepares `out-firefox/` and signs the Firefox unlisted XPI using `AMO_JWT_ISSUER` and `AMO_JWT_SECRET`.
- `npm run lint` runs the configured ESLint rules across the source tree.
- `npm run sync-worker:typecheck` checks the Cloudflare Worker TypeScript sources.
- `cd sync-worker && npm run dev` starts the Worker locally after installing Worker dependencies.
- `cd sync-worker && npm run migrate:local` applies D1 migrations locally.

## Coding Style & Naming Conventions

Write TypeScript and React function components. Use `PascalCase` for component files and exports, such as `ThemeToggle.tsx`; use `camelCase` for variables, functions, and context values. Keep shared interfaces in `types/index.ts` when used across modules. Prefer Tailwind utility classes for styling and reserve `styles/globals.css` for global rules. Route persistence through the storage helper in `lib/storage.ts` rather than reading or writing extension storage directly from components; update sync status metadata when user data is saved. Optional account sync should go through `lib/cloudSync.ts`, keep the session token in `browser.storage.local`, and keep non-sensitive sync metadata in `settings`. When cloud sync is enabled, default local persistence to `browser.storage.local` instead of `browser.storage.sync`. Keep bookmark URL validation centralized in `lib/bookmarkValidation.ts` or an equivalent shared helper, and keep icon URL byte-size validation in `lib/iconValidation.ts`. ESLint rejects unused variables unless prefixed with `_`, so remove dead code or intentionally name ignored values like `_event`.

## Testing Guidelines

No dedicated test framework is currently configured. For now, validate extension changes with `npm run lint`, `npm run build`, and `npm run extension:firefox:lint`, and validate Worker changes with `npm run sync-worker:typecheck`. For extension behavior, manually load `out/` as an unpacked extension in Chrome or Edge, and run `npm run extension:firefox` for Firefox. Verify new-tab override, toolbar popup quick-save, settings page navigation, search, add/edit/delete/pin bookmarks, add categories, theme switching, sync status display, JSON import/export, refresh persistence, browser sync/local storage writes, browser-sync toggle migration, 50KB icon URL limits, and optional GitHub/Cloudflare cloud sync login/upload/pull/logout. For cloud sync, verify local edits only mark pending upload, manual upload pushes immediately, scheduled daily/interval checks upload only when the snapshot hash changed, and manual pull remains explicit. When adding tests in the future, place them near the related source or in a clear `tests/` directory, use descriptive names such as `BookmarkCard.test.tsx`, and document the new test command in `package.json` and this file.

## Commit & Pull Request Guidelines

This checkout does not include Git history, so no repository-specific commit convention can be inferred. Use concise, imperative commit messages such as `Add bookmark import validation` or Conventional Commit style like `feat: add bookmark search filters`. Pull requests should include a short summary, testing performed, linked issues if applicable, and screenshots or screen recordings for UI changes.

## Security & Configuration Tips

Do not commit secrets, local environment files, or generated build output such as `.next/`, `out/`, `out-firefox/`, and `node_modules/`. Keep Cloudflare Worker secrets in Wrangler secrets, not in source files. Keep user-editable bookmark defaults in `data/bookmarks.ts`, and put static images or SVGs in `public/` rather than importing them from component code unless bundling is required. Keep extension permissions minimal; the default permission set is `storage`, `activeTab`, `identity`, and `alarms`, with `host_permissions` restricted to the configured Worker domain. Firefox AMO packages must declare `data_collection_permissions` for cloud-synced bookmark data and GitHub authentication/session data. Do not introduce remote executable code, `eval`, or inline scripts, because Manifest V3 extension pages are constrained by extension CSP. Extension page assets should come from the packaged build or from user-entered external links. UI work should follow the glassmorphism direction used by the new-tab, popup, and settings pages: translucent surfaces, light borders, readable contrast, and stable desktop/mobile dimensions.
