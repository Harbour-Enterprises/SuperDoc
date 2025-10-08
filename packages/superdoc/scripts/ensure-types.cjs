#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const distIndexPath = path.resolve(__dirname, '../dist/index.d.ts');
const fallbackIndexPath = path.resolve(__dirname, '../types/index.d.ts');

const hasSuperDocExport = (content) => /export\s+\{[^}]*\bSuperDoc\b[^}]*\}/m.test(content);

const readFileIfExists = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return fs.readFileSync(filePath, 'utf8');
};

const ensureDistFile = () => {
  const fallbackContent = readFileIfExists(fallbackIndexPath);

  if (!fallbackContent) {
    console.error('[ensure-types] Missing fallback declaration file at', fallbackIndexPath);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(distIndexPath), { recursive: true });
  fs.writeFileSync(distIndexPath, fallbackContent, 'utf8');
  console.warn('[ensure-types] Applied fallback index.d.ts to ensure SuperDoc export.');
  return fallbackContent;
};

let distContent = readFileIfExists(distIndexPath);

if (!distContent) {
  distContent = ensureDistFile();
}

if (!hasSuperDocExport(distContent)) {
  console.warn('[ensure-types] SuperDoc export missing in generated declarations. Using fallback file.');
  distContent = ensureDistFile();
}

if (!hasSuperDocExport(distContent)) {
  console.error('[ensure-types] Unable to verify SuperDoc export even after applying fallback.');
  process.exit(1);
}

console.log('[ensure-types] Verified SuperDoc export in dist/index.d.ts');

