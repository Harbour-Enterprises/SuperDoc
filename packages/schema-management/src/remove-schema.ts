#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const versionsRoot = path.join(packageRoot, 'versions');
const manifestPath = path.join(versionsRoot, 'schemas.json');

async function main() {
  const version = parseVersion(process.argv.slice(2));
  if (!version) {
    console.error('Usage: npm run remove -- --version <semver>');
    process.exit(1);
  }

  const manifest = await readManifest(manifestPath);
  if (!manifest.versions?.[version]) {
    console.error(`Version ${version} not found in manifest.`);
    process.exit(1);
  }

  const versionDir = path.join(versionsRoot, version);
  await fs.rm(versionDir, { recursive: true, force: true });

  const updated = { ...manifest };
  delete updated.versions[version];
  await fs.writeFile(manifestPath, JSON.stringify(updated, null, 2));

  console.log(`Removed schema version ${version}.`);
}

function parseVersion(args: string[]): string | null {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--version=')) return arg.split('=')[1];
    if (arg === '--version') return args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
    if (!arg.startsWith('--')) return arg;
  }
  return null;
}

async function readManifest(filePath: string) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

await main();
