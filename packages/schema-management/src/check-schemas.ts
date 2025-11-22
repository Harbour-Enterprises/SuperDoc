#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const versionsRoot = path.join(packageRoot, 'versions');
const manifestPath = path.join(versionsRoot, 'schemas.json');

async function main() {
  const manifest = await readManifest(manifestPath);
  const versionDirs = await listVersionDirs();
  const manifestVersions = Object.keys(manifest.versions || {});

  const missingDirs = manifestVersions.filter((v) => !versionDirs.includes(v));
  const orphanDirs = versionDirs.filter((v) => !manifestVersions.includes(v));

  if (missingDirs.length || orphanDirs.length) {
    console.error('Schema manifest and versions directory are out of sync.');
    if (missingDirs.length) console.error(`Missing directories for versions: ${missingDirs.join(', ')}`);
    if (orphanDirs.length) console.error(`Orphan version directories not in manifest: ${orphanDirs.join(', ')}`);
    process.exit(1);
  }

  console.log('Schema manifest and versions directory are in sync.');
}

async function readManifest(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to read manifest at ${filePath}:`, error);
    process.exit(1);
  }
}

async function listVersionDirs() {
  const entries = await fs.readdir(versionsRoot, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

await main();
