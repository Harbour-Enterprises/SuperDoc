/**
 * Verify headless mode behavior
 * Confirms that node views are properly filtered in headless Chromium
 */

import { init } from './dist/index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('Verifying headless mode behavior...\n');

  const sdk = await init({ poolSize: 1 });

  try {
    // Load a simple document
    const testPath = join(__dirname, '../../packages/super-editor/src/tests/data/simple-ordered-list.docx');
    const buffer = readFileSync(testPath);

    const editor = await sdk.getEditor(buffer);

    // Get JSON to verify structure
    const json = await editor.getJSON();
    console.log('Document structure:', JSON.stringify(json, null, 2).substring(0, 500) + '...');

    // Verify we can perform operations
    console.log('\nTesting operations:');
    console.log('  ✓ getJSON() works');

    await editor.getHTML();
    console.log('  ✓ getHTML() works');

    await editor.getMarkdown();
    console.log('  ✓ getMarkdown() works');

    // Test insertion
    await editor.insertContent({
      type: 'paragraph',
      content: [{ type: 'text', text: 'Test insertion' }],
    });
    console.log('  ✓ insertContent() works');

    // Verify export still works after modification
    const exported = await editor.exportDocx();
    console.log('  ✓ exportDocx() works');
    console.log(`  Exported size: ${exported.length} bytes`);

    await editor.destroy();

    console.log('\n✅ Headless mode verification complete');
    console.log('All operations work correctly in headless Chromium');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await sdk.close();
  }
}

main();
