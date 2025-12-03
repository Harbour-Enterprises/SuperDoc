# SuperDoc + Y-Sweet Example

Real-time collaboration using SuperDoc with a custom [Y-Sweet](https://y-sweet.dev) provider.

## Quick Start (Local)

```bash
# Terminal 1: Start Y-Sweet server
npm install
npm run ysweet:serve

# Terminal 2: Start the app
npm run dev
```

Open http://localhost:5173 in multiple windows to test collaboration.

## Key Integration Points

### 1. Create the Y-Sweet provider and Y.Doc

```javascript
import * as Y from 'yjs';
import { createYjsProvider } from '@y-sweet/client';

const ydoc = new Y.Doc();
const provider = await createYjsProvider(ydoc, DOC_ID, authEndpointOrTokenFn);
```

### 2. Pass them to SuperDoc via `customProvider`

```javascript
new SuperDoc({
  documents: [
    {
      id: DOC_ID,
      type: 'docx',
      url: '/sample-document.docx', // Initial content for new docs
      isNewFile: true,              // Required for new collaborative docs
    },
  ],
  modules: {
    collaboration: {
      customProvider: {
        provider,  // Y-Sweet provider instance
        ydoc,      // Y.Doc instance
      },
    },
  },
});
```

### 3. Required document properties for new files

- `url` or `data`: Initial document content (loaded once, then synced via Y.js)
- `isNewFile: true`: Tells SuperDoc to push initial content to Y.js

## Configuration

Copy `.env.example` to `.env.local` and configure:

| Variable | Description |
|----------|-------------|
| `VITE_YSWEET_AUTH` | Auth endpoint URL (recommended for production) |
| `VITE_YSWEET_SERVER` | Direct connection string (dev only) |
| `VITE_DOC_ID` | Document ID (default: `superdoc-demo-doc`) |

## Production Setup

Use an auth endpoint instead of exposing connection strings:

```javascript
// Backend
app.post('/api/ysweet-auth', async (req, res) => {
  const { docId } = req.body;
  const token = await manager.getOrCreateDocAndToken(docId);
  res.json(token);
});

// Frontend (.env.local)
VITE_YSWEET_AUTH=/api/ysweet-auth
```
