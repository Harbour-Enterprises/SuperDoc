/**
 * Test the SuperDoc SDK
 */

import { init } from './dist/index.js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('Testing SuperDoc SDK...\n');

  // Initialize SDK
  console.log('1. Initializing SDK...');
  const sdk = await init({
    poolSize: 2,
    timeout: 30000,
  });
  console.log('   ✓ SDK initialized\n');

  try {
    // Load test DOCX
    console.log('2. Loading DOCX file...');
    const testDocxPath = join(__dirname, '../../packages/super-editor/src/tests/data/image_doc.docx');
    const docxBuffer = readFileSync(testDocxPath);
    console.log(`   Loaded ${docxBuffer.length} bytes`);

    const editor = await sdk.getEditor(docxBuffer);
    console.log('   ✓ Editor created\n');

    // Get JSON
    console.log('3. Getting document as JSON...');
    const json = await editor.getJSON();
    console.log(`   ✓ JSON retrieved (${json.content?.length || 0} top-level nodes)\n`);

    // Get HTML
    console.log('4. Getting document as HTML...');
    const html = await editor.getHTML();
    console.log(`   ✓ HTML retrieved (${html.length} chars)\n`);

    // Get Markdown
    console.log('5. Getting document as Markdown...');
    const markdown = await editor.getMarkdown();
    console.log(`   ✓ Markdown retrieved (${markdown.length} chars)\n`);

    // Insert content
    console.log('6. Inserting content...');
    await editor.insertContent({
      type: 'paragraph',
      content: [{ type: 'text', text: 'Added via SuperDoc SDK!' }],
    });
    console.log('   ✓ Content inserted\n');

    // Export DOCX
    console.log('7. Exporting document...');
    const outputBuffer = await editor.exportDocx();
    console.log(`   ✓ Export successful (${outputBuffer.length} bytes)\n`);

    // Save output
    const outputPath = join(__dirname, 'test-sdk-output.docx');
    writeFileSync(outputPath, outputBuffer);
    console.log(`8. Saved to: ${outputPath}\n`);

    // Test getMetadata
    console.log('9. Getting metadata...');
    const metadata = await editor.getMetadata();
    console.log('   ✓ Metadata retrieved:', Object.keys(metadata || {}).length, 'keys\n');

    // Clean up editor
    console.log('10. Destroying editor...');
    await editor.destroy();
    console.log('    ✓ Editor destroyed\n');

    // Check stats
    const stats = sdk.getStats();
    console.log('Pool statistics:', stats);

    console.log('\n✅ SDK test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    console.log('\nClosing SDK...');
    await sdk.close();
    console.log('SDK closed');
  }
}

main();
