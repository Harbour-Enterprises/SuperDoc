# SuperDoc HTTP Service

HTTP/JSON API for SuperDoc SDK. Enables Python and other languages to use SuperDoc.

## Run

```bash
npm install
npm run build
npm start         # Default port: 3456
npm start 8080    # Custom port
```

## API

POST to `/` with JSON body:

```json
{"method": "methodName", "params": {...}}
```

### Methods

| Method | Params | Returns |
|--------|--------|---------|
| `ping` | - | `{ pong: true }` |
| `loadDocx` | `{ docx: base64 }` | `{ sessionId }` |
| `getJSON` | `{ sessionId }` | ProseMirror JSON |
| `getHTML` | `{ sessionId }` | HTML string |
| `getMarkdown` | `{ sessionId }` | Markdown string |
| `getMetadata` | `{ sessionId }` | Document metadata |
| `getLifecycle` | `{ sessionId }` | `{ lifecycle }` |
| `insertContent` | `{ sessionId, content }` | `{ success }` |
| `exportDocx` | `{ sessionId }` | `{ docx: base64 }` |
| `close` | `{ sessionId }` | `{ success }` |
| `open` | `{ sessionId, docx: base64 }` | `{ success }` |
| `destroy` | `{ sessionId }` | `{ success }` |

### Example

```bash
# Load document
curl -X POST http://localhost:3456 \
  -H "Content-Type: application/json" \
  -d '{"method": "loadDocx", "params": {"docx": "'$(base64 -i doc.docx)'"}}'

# Get HTML
curl -X POST http://localhost:3456 \
  -H "Content-Type: application/json" \
  -d '{"method": "getHTML", "params": {"sessionId": "session_1"}}'
```

## Used By

- [Python SDK](../../langs/python/) - Auto-starts as subprocess
