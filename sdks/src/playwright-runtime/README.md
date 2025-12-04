# SuperDoc Playwright Runtime

Headless browser runtime for SuperDoc Editor operations.

## Usage

```typescript
import { SuperdocRuntime } from '@superdoc/playwright-runtime';

const runtime = new SuperdocRuntime({ poolSize: 2 });
await runtime.start();

const ops = runtime.getOperations();
const editor = await ops.loadDocx(docxBuffer);

// Read
await editor.getJSON();
await editor.getHTML();
await editor.getMarkdown();
await editor.getMetadata();
await editor.getLifecycle();

// Write
await editor.insertContent('<p>Hello!</p>');
await editor.exportDocx();

// Lifecycle
await editor.close();
await editor.open(newBuffer);
await editor.destroy();

await runtime.stop();
```

## Configuration

```typescript
interface RuntimeConfig {
  poolSize?: number;        // Default: 2
  headless?: boolean;       // Default: true
  timeout?: number;         // Default: 30000ms
  port?: number;            // Static server port, default: 9999
  editorDistPath?: string;  // Path to super-editor dist
  chromiumPath?: string;    // Custom Chromium path
}
```

## Error Codes

- `BROWSER_LAUNCH_FAILED` - Browser failed to start
- `CONTEXT_POOL_EXHAUSTED` - All contexts in use
- `EDITOR_LOAD_FAILED` - Failed to load DOCX
- `EDITOR_OPERATION_FAILED` - Operation failed

## Build

```bash
npm run build
```
