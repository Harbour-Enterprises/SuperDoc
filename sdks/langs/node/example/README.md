# SuperDoc SDK Example

Headless DOCX operations using the SuperDoc SDK.

## Run

```bash
npm install
npm start                          # Use default test file
npm start /path/to/document.docx   # Or your own DOCX
```

## API Reference

```javascript
import { init } from '@superdoc-dev/superdoc-sdk';

// Initialize SDK (starts headless Chromium)
const sdk = await init({ poolSize: 2 });

// Load a DOCX file
const editor = await sdk.getEditor(docxBuffer);

// Read operations
await editor.getJSON();       // ProseMirror JSON
await editor.getHTML();       // HTML string
await editor.getMarkdown();   // Markdown string
await editor.getMetadata();   // Document metadata
await editor.getLifecycle();  // 'idle' | 'ready' | 'destroyed'

// Write operations
await editor.insertContent('<p>Hello</p>');
await editor.exportDocx();    // Returns Buffer

// Lifecycle: reuse editor for multiple documents
await editor.close();         // Close doc, keep editor alive
await editor.open(newBuffer); // Open new doc in same editor
await editor.destroy();       // Release editor

// Cleanup
await sdk.close();
```
