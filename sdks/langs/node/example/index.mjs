/**
 * SuperDoc SDK Example
 *
 * Usage:
 *   npm install
 *   npm start [path-to-docx]
 */

import { init } from '@superdoc-dev/superdoc-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get docx path from args or use default test file
const docxPath = process.argv[2]
  || '../../../../packages/super-editor/src/tests/data/Hello docx world.docx';
const resolvedPath = path.resolve(__dirname, docxPath);

console.log(`\n📄 Loading: ${resolvedPath}\n`);

// Initialize SDK (starts headless Chromium)
console.log('🚀 Initializing SDK...');
const sdk = await init();
console.log('✅ SDK ready\n');

try {
  // Load your DOCX
  const buffer = fs.readFileSync(resolvedPath);
  const editor = await sdk.getEditor(buffer);

  // Check lifecycle state
  console.log('📊 Lifecycle:', await editor.getLifecycle(), '\n');

  // ─────────────────────────────────────────────
  // Play around here!
  // ─────────────────────────────────────────────

  // Get document as JSON
  const json = await editor.getJSON();
  console.log('📋 Document JSON (preview):');
  console.log(JSON.stringify(json, null, 2).slice(0, 500) + '...\n');

  // Get metadata
  const metadata = await editor.getMetadata();
  console.log('ℹ️  Metadata:', metadata, '\n');

  // Get HTML
  const html = await editor.getHTML();
  console.log('🌐 HTML (preview):');
  console.log(html.slice(0, 300) + '...\n');

  // Insert some content
  await editor.insertContent('<p>Hello from the SuperDoc SDK!</p>');
  console.log('✏️  Inserted: "<p>Hello from the SuperDoc SDK!</p>"\n');

  // Export back to DOCX
  const exported = await editor.exportDocx();
  const outPath = path.resolve(__dirname, 'output.docx');
  fs.writeFileSync(outPath, exported);
  console.log(`💾 Exported to: ${outPath} (${(exported.length / 1024).toFixed(1)} KB)\n`);

  // ─────────────────────────────────────────────
  // Demo: open() / close() lifecycle
  // ─────────────────────────────────────────────
  console.log('─'.repeat(50));
  console.log('Demo: Using open() to load another document\n');

  // Close the current document (editor stays alive)
  await editor.close();
  console.log('📊 Lifecycle after close():', await editor.getLifecycle());

  // Open a different document (reusing same editor)
  const anotherDoc = path.resolve(__dirname, '../../../../packages/super-editor/src/tests/data/blank-doc.docx');
  if (fs.existsSync(anotherDoc)) {
    const buffer2 = fs.readFileSync(anotherDoc);
    await editor.open(buffer2);
    console.log('📊 Lifecycle after open():', await editor.getLifecycle());

    const json2 = await editor.getJSON();
    console.log('📋 New document loaded! Content nodes:', json2.content?.length || 0, '\n');
  }

  // Clean up editor
  await editor.destroy();
  console.log('📊 Lifecycle after destroy():', await editor.getLifecycle());

} finally {
  // Always close the SDK
  await sdk.close();
  console.log('\n👋 Done!\n');
}
