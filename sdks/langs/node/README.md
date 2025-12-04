# SuperDoc SDK for Node.js

Official SDK for headless DOCX document operations using SuperDoc Editor.

## Installation

```bash
npm install @superdoc-dev/superdoc-sdk
```

The postinstall script will automatically download Chromium (~160MB) via Playwright.

### Environment Variables

- `SUPERDOC_CHROMIUM_PATH`: Path to custom Chromium executable (skips download)
- `SUPERDOC_BROWSER_DOWNLOAD=0`: Skip automatic Chromium download

## Quick Start

```typescript
import { init } from '@superdoc-dev/superdoc-sdk';
import { readFileSync, writeFileSync } from 'fs';

// Initialize SDK (auto-starts runtime with default pool size of 2)
const sdk = await init();

try {
  // Load a DOCX file
  const docxBuffer = readFileSync('input.docx');
  const editor = await sdk.getEditor(docxBuffer);

  // Get document in various formats
  const json = await editor.getJSON();        // ProseMirror JSON
  const html = await editor.getHTML();        // HTML string
  const markdown = await editor.getMarkdown(); // Markdown string
  const metadata = await editor.getMetadata(); // Document metadata

  // Modify the document
  await editor.insertContent({
    type: 'paragraph',
    content: [{ type: 'text', text: 'Added via SDK!' }]
  });

  // Export back to DOCX
  const outputBuffer = await editor.exportDocx();
  writeFileSync('output.docx', outputBuffer);

  // Clean up this editor (releases context back to pool)
  await editor.destroy();

} finally {
  // Shutdown SDK (closes browser and pool)
  await sdk.close();
}
```

## API Reference

### SDK Initialization

#### `init(config?): Promise<SuperdocSDK>`

Initialize and start the SDK.

```typescript
const sdk = await init({
  poolSize: 2,           // Number of concurrent contexts (default: 2)
  chromiumPath: '/path', // Custom Chromium path (optional)
  timeout: 30000,        // Operation timeout in ms (default: 30000)
});
```

### SDK Methods

#### `sdk.getEditor(docxBuffer: Buffer): Promise<Editor>`

Load a DOCX file and get an editor handle.

```typescript
const docxBuffer = readFileSync('document.docx');
const editor = await sdk.getEditor(docxBuffer);
```

#### `sdk.getStats()`

Get context pool statistics.

```typescript
const { total, inUse, available } = sdk.getStats();
console.log(`Pool: ${inUse}/${total} contexts in use`);
```

#### `sdk.close(): Promise<void>`

Shutdown the SDK and cleanup all resources.

```typescript
await sdk.close();
```

### Editor Methods

#### `editor.getJSON(): Promise<DocumentJSON>`

Get document as ProseMirror JSON.

#### `editor.getHTML(): Promise<string>`

Get document as HTML string.

#### `editor.getMarkdown(): Promise<string>`

Get document as Markdown string.

#### `editor.exportDocx(): Promise<Buffer>`

Export document as DOCX buffer.

#### `editor.getMetadata(): Promise<DocumentMetadata>`

Get document metadata.

#### `editor.insertContent(content: InsertableContent): Promise<void>`

Insert content into the document. Accepts HTML string or ProseMirror JSON.

```typescript
await editor.insertContent({
  type: 'paragraph',
  content: [{ type: 'text', text: 'Hello!' }]
});
```

#### `editor.destroy(): Promise<void>`

Destroy the editor and release the browser context back to the pool.

**Important**: Always call `destroy()` when done with an editor to free resources.

## Configuration

```typescript
interface SDKConfig {
  poolSize?: number;      // Default: 2
  chromiumPath?: string;  // Optional custom Chromium path
  timeout?: number;       // Default: 30000ms
}
```

### Pool Size

The pool size determines how many documents can be processed concurrently. Default is 2.

```typescript
const sdk = await init({ poolSize: 5 });

// Can now handle 5 concurrent documents
const editors = await Promise.all([
  sdk.getEditor(buffer1),
  sdk.getEditor(buffer2),
  sdk.getEditor(buffer3),
  sdk.getEditor(buffer4),
  sdk.getEditor(buffer5),
]);
```

If you exceed the pool size, additional requests will wait for a context to become available.

## Error Handling

The SDK throws typed errors from the runtime:

```typescript
import { init } from '@superdoc-dev/superdoc-sdk';

try {
  const sdk = await init();
  const editor = await sdk.getEditor(docxBuffer);
  // ... operations
} catch (error) {
  console.error('SDK error:', error.message);
  // Handle specific error codes if needed
}
```

## Examples

### Basic Document Processing

```typescript
import { init } from '@superdoc-dev/superdoc-sdk';
import { readFileSync, writeFileSync } from 'fs';

const sdk = await init();

const docx = readFileSync('input.docx');
const editor = await sdk.getEditor(docx);

const json = await editor.getJSON();
console.log('Document has', json.content.length, 'nodes');

await editor.destroy();
await sdk.close();
```

### Concurrent Document Processing

```typescript
import { init } from '@superdoc-dev/superdoc-sdk';
import { readFileSync } from 'fs';

const sdk = await init({ poolSize: 3 });

const files = ['doc1.docx', 'doc2.docx', 'doc3.docx'];
const buffers = files.map(f => readFileSync(f));

// Process all documents concurrently
const results = await Promise.all(
  buffers.map(async (buffer) => {
    const editor = await sdk.getEditor(buffer);
    const json = await editor.getJSON();
    await editor.destroy();
    return json;
  })
);

console.log('Processed', results.length, 'documents');
await sdk.close();
```

### Document Transformation Pipeline

```typescript
import { init } from '@superdoc-dev/superdoc-sdk';
import { readFileSync, writeFileSync } from 'fs';

const sdk = await init();

async function transformDocument(inputPath, outputPath) {
  const buffer = readFileSync(inputPath);
  const editor = await sdk.getEditor(buffer);

  // Add header
  await editor.insertContent({
    type: 'heading',
    attrs: { level: 1 },
    content: [{ type: 'text', text: 'Processed Document' }]
  });

  // Export
  const output = await editor.exportDocx();
  writeFileSync(outputPath, output);

  await editor.destroy();
}

await transformDocument('input.docx', 'output.docx');
await sdk.close();
```

## Requirements

- Node.js 18+ (ES modules support)
- ~160MB disk space for Chromium
- Linux/macOS/Windows support

## License

AGPL-3.0
