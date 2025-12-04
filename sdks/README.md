# SuperDoc SDKs

Headless DOCX processing using the SuperDoc Editor.

## Available SDKs

| SDK | Location | Status |
|-----|----------|--------|
| **Node.js** | [`langs/node/`](./langs/node/) | Ready |
| **Python** | [`langs/python/`](./langs/python/) | Ready |

## Architecture

```
┌─────────────────┐
│  Node.js SDK    │  or  Python SDK
└────────┬────────┘
         │
┌────────▼────────┐
│  HTTP Service   │  JSON-RPC over HTTP
│  (src/service)  │
└────────┬────────┘
         │
┌────────▼────────┐
│  Playwright     │  Headless Chromium
│  Runtime        │
└────────┬────────┘
         │
┌────────▼────────┐
│  Super Editor   │  DOCX parsing & export
└─────────────────┘
```

## Quick Start

### Node.js

```typescript
import { init } from '@superdoc-dev/superdoc-sdk';

const sdk = await init();
const editor = await sdk.getEditor(docxBuffer);

const html = await editor.getHTML();
const markdown = await editor.getMarkdown();

await editor.destroy();
await sdk.close();
```

### Python

```python
from superdoc_sdk import superdoc

# One-liners
html = superdoc.to_html("doc.docx")
markdown = superdoc.to_markdown("doc.docx")

# Or with full control
from superdoc_sdk import SuperdocClient

with SuperdocClient().get_editor("doc.docx") as editor:
    html = editor.get_html()
    editor.export_docx("output.docx")
```

## Project Structure

```
sdks/
├── langs/
│   ├── node/           # Node.js SDK
│   └── python/         # Python SDK
└── src/
    ├── service/        # HTTP API service
    └── playwright-runtime/  # Browser runtime
```

## Documentation

- [Node.js SDK](./langs/node/README.md)
- [Python SDK](./langs/python/README.md)
- [HTTP Service](./src/service/README.md)
