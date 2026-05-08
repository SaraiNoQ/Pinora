import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = resolve(rootDir, 'out');
const targetDir = resolve(rootDir, 'out-firefox');
const manifestPath = resolve(targetDir, 'manifest.json');

await rm(targetDir, { force: true, recursive: true });
await mkdir(targetDir, { recursive: true });
await cp(sourceDir, targetDir, { recursive: true });

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.background = {
  scripts: ['background.js'],
};
manifest.browser_specific_settings ??= {};
manifest.browser_specific_settings.gecko ??= {};
manifest.browser_specific_settings.gecko.strict_min_version = '140.0';
manifest.browser_specific_settings.gecko.data_collection_permissions = {
  required: ['bookmarksInfo', 'authenticationInfo'],
  optional: [],
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
