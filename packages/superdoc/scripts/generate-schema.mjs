#!/usr/bin/env node

/**
 * Build script to generate JSON Schema from SuperDoc ProseMirror schema
 *
 * Runs after building the superdoc package to generate a JSON Schema file
 * that can be used for:
 * - Runtime validation with AJV
 * - Claude API tool calling
 * - Documentation generation
 * - TypeScript type generation
 *
 * This script is automatically run after the build completes.
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Generating JSON Schema from SuperDoc ProseMirror schema...\n');

// Create mock DOM environment for Node.js
const { window: mockWindow } = new JSDOM('<!doctype html><html><body></body></html>');
const mockDocument = mockWindow.document;

try {
  // Import from the built package
  const { Editor, getStarterExtensions } = await import('../dist/super-editor.es.js');
  const { generateJSONSchema } = await import('../src/utils/generateJSONSchema.js');

  // Create an editor instance with starter extensions in headless mode
  console.log('📝 Creating editor instance with starter extensions...');
  const element = mockDocument.createElement('div');

  const editor = new Editor({
    element,
    extensions: getStarterExtensions(),
    content: '',
    isHeadless: true,
    mockDocument,
    mockWindow,
    mode: 'docx',
    documentId: 'schema-generator',
  });

  console.log(`✅ Editor created with ${Object.keys(editor.schema.nodes).length} node types and ${Object.keys(editor.schema.marks).length} mark types\n`);

  // Generate the JSON Schema
  console.log('🛠️  Generating JSON Schema...');
  const jsonSchema = generateJSONSchema(editor);

  console.log(`✅ Schema generated with ${Object.keys(jsonSchema.definitions).length} definitions\n`);

  // Write to dist folder
  const outputPath = resolve(__dirname, '../dist/superdoc-schema.json');
  writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2));

  console.log(`✅ Schema written to: ${outputPath}\n`);

  // Print summary
  console.log('📊 Schema Summary:');
  console.log(`  - ${Object.keys(editor.schema.nodes).length} node types`);
  console.log(`  - ${Object.keys(editor.schema.marks).length} mark types`);
  console.log(`  - ${Object.keys(jsonSchema.definitions).length} definitions`);

  console.log('\n✅ Schema generation complete!');

} catch (error) {
  console.error('❌ Error generating schema:', error.message);
  console.error(error.stack);
  process.exit(1);
}
