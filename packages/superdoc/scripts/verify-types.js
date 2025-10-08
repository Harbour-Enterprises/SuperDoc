#!/usr/bin/env node

/**
 * Build verification script to ensure SuperDoc is properly exported in generated types
 * This script checks that the main export (SuperDoc) is correctly present in the generated .d.ts files
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distPath = join(__dirname, '..', 'dist');
const indexDtsPath = join(distPath, 'index.d.ts');

function verifyTypes() {
  console.log('🔍 Verifying TypeScript declarations...');

  // Check if dist/index.d.ts exists
  if (!existsSync(indexDtsPath)) {
    console.error('❌ Error: dist/index.d.ts not found');
    console.error('   Run `npm run build` first to generate type declarations');
    process.exit(1);
  }

  // Read the index.d.ts file
  const indexDtsContent = readFileSync(indexDtsPath, 'utf-8');

  // Check for SuperDoc export
  const hasSuperDocExport =
    indexDtsContent.includes('export { SuperDoc }') ||
    indexDtsContent.includes('export * from') ||
    indexDtsContent.match(/export\s+{\s*[^}]*SuperDoc[^}]*\s*}/);

  if (!hasSuperDocExport) {
    console.error('❌ Error: SuperDoc is not properly exported in dist/index.d.ts');
    console.error('   Expected to find: export { SuperDoc }');
    console.error('   Found content:');
    console.error('   ' + indexDtsContent.split('\n').slice(0, 5).join('\n   '));
    process.exit(1);
  }

  // Check that .d.ts doesn't have incorrect references
  const hasJsExtensions = indexDtsContent.match(/from\s+["']\.\/.*\.js["']/);
  if (hasJsExtensions) {
    console.warn('⚠️  Warning: Type declaration file references .js extensions');
    console.warn('   This is acceptable but may cause issues in some TypeScript configurations');
    console.warn('   Found:', hasJsExtensions[0]);
  }

  console.log('✅ TypeScript declarations verified successfully');
  console.log('   - SuperDoc export: found');
  console.log('   - Declaration file: dist/index.d.ts exists');
}

try {
  verifyTypes();
} catch (error) {
  console.error('❌ Verification failed:', error.message);
  process.exit(1);
}
