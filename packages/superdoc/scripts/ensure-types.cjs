#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const distIndexPath = path.resolve(__dirname, '../dist/index.d.ts');

if (!fs.existsSync(distIndexPath)) {
  console.error('[ensure-types] Missing dist/index.d.ts');
  process.exit(1);
}

const content = fs.readFileSync(distIndexPath, 'utf8');
const hasSuperDocExport = /export\s+\{[^}]*\bSuperDoc\b[^}]*\}/m.test(content);

if (!hasSuperDocExport) {
  console.error('[ensure-types] SuperDoc export missing in dist/index.d.ts');
  process.exit(1);
}

console.log('[ensure-types] ✓ Verified SuperDoc export in dist/index.d.ts');

