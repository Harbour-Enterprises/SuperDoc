/**
 * Simple test to verify the runtime works
 */

import { SuperdocRuntime } from './dist/index.js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('Testing SuperDoc Runtime...\n');

  const runtime = new SuperdocRuntime({
    poolSize: 2,
    headless: true,
  });

  try {
    // Start runtime
    console.log('1. Starting runtime...');
    await runtime.start();
    console.log('   ✓ Runtime started\n');

    // Get operations
    const ops = runtime.getOperations();

    // Load test DOCX
    console.log('2. Loading test DOCX...');
    const testDocxPath = join(__dirname, '../../packages/super-editor/src/tests/data/image_doc.docx');
    const docxBuffer = readFileSync(testDocxPath);
    console.log(`   Loaded ${docxBuffer.length} bytes`);

    const editor = await ops.loadDocx(docxBuffer);
    console.log('   ✓ Editor created\n');

    // Get JSON
    console.log('3. Getting JSON...');
    const json = await editor.getJSON();
    console.log(`   ✓ JSON retrieved (${json.content?.length || 0} top-level nodes)\n`);

    // Get HTML
    console.log('4. Getting HTML...');
    const html = await editor.getHTML();
    console.log(`   ✓ HTML retrieved (${html.length} chars)\n`);

    // Export DOCX
    console.log('5. Exporting DOCX...');
    const outputBuffer = await editor.exportDocx();
    console.log(`   ✓ Export successful (${outputBuffer.length} bytes)\n`);

    // Save output
    const outputPath = join(__dirname, 'test-output.docx');
    writeFileSync(outputPath, outputBuffer);
    console.log(`6. Saved to: ${outputPath}\n`);

    // Clean up editor
    await editor.destroy();
    console.log('7. Editor destroyed\n');

    // Test pool stats
    const stats = runtime.getStats();
    console.log('Pool statistics:', stats);

    console.log('\n✅ Runtime test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await runtime.stop();
    console.log('\nRuntime stopped');
  }
}

main();
