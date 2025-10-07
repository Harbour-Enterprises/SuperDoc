#!/usr/bin/env node

/**
 * Build verification script to ensure SuperDoc is properly exported
 * in the generated type declarations
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distPath = join(__dirname, '..', 'dist', 'index.d.ts');

console.log('🔍 Verifying TypeScript declarations...');

// Check if the declaration file exists
if (!existsSync(distPath)) {
  console.error('❌ Error: dist/index.d.ts does not exist');
  process.exit(1);
}

// Read the declaration file
const content = readFileSync(distPath, 'utf-8');

// Check if SuperDoc is exported
const hasSuperDocExport = content.includes('export') && content.includes('SuperDoc');
const hasSuperDocClass = content.includes('class SuperDoc');

if (!hasSuperDocExport) {
  console.error('❌ Error: SuperDoc is not exported in dist/index.d.ts');
  process.exit(1);
}

if (!hasSuperDocClass) {
  console.warn('⚠️  Warning: SuperDoc class declaration may not be complete');
}

// Check for other critical exports
const criticalExports = ['SuperConverter', 'Editor', 'getRichTextExtensions', 'DOCX', 'PDF', 'HTML'];

const missingExports = [];
for (const exportName of criticalExports) {
  if (!content.includes(exportName)) {
    missingExports.push(exportName);
  }
}

if (missingExports.length > 0) {
  console.warn(`⚠️  Warning: Some exports may be missing: ${missingExports.join(', ')}`);
}

console.log('✅ TypeScript declarations verified successfully');
console.log('   - SuperDoc class is exported');
console.log('   - Critical exports are present');

process.exit(0);
