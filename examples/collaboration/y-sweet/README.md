# SuperDoc + Y-Sweet Example

This example demonstrates using SuperDoc with [Y-Sweet](https://docs.jamsocket.com/y-sweet) as a self-hosted collaboration provider.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│ Auth Server │────▶│  Y-Sweet    │
│  (React)    │     │  (Express)  │     │   Server    │
└─────────────┘     └─────────────┘     └─────────────┘
    :3000              :3001               :8080
```

- **Y-Sweet Server** (port 8080): The Yjs sync engine that handles real-time collaboration
- **Auth Server** (port 3001): Express server that authenticates clients and issues tokens
- **Client** (port 3000): React app with SuperDoc

## Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Start the Y-Sweet server** (in terminal 1)
   ```bash
   pnpm dev:y-sweet
   ```
   This runs `npx y-sweet@latest serve` on port 8080.

3. **Start the auth server and client** (in terminal 2)
   ```bash
   pnpm dev
   ```
   This starts both the Express auth server (:3001) and Vite dev server (:3000).

4. Open http://localhost:3000 in multiple browser tabs to test collaboration

## How It Works

### Auth Server (`server/server.js`)
```js
import { DocumentManager } from '@y-sweet/sdk';

const manager = new DocumentManager('ys://127.0.0.1:8080');

app.post('/api/auth', async (req, res) => {
  const { docId } = req.body;
  const clientToken = await manager.getOrCreateDocAndToken(docId);
  res.json(clientToken);
});
```

### Client (`client/src/App.tsx`)
```js
import { createYjsProvider } from '@y-sweet/client';
import * as Y from 'yjs';

const ydoc = new Y.Doc();
const provider = createYjsProvider(ydoc, 'doc-id', 'http://localhost:3001/api/auth');

provider.on('sync', (synced) => {
  if (!synced) return;

  new SuperDoc({
    selector: '#superdoc',
    modules: {
      collaboration: { ydoc, provider },
    },
  });
});
```

## Configuration

### Environment Variables

**Server** (`server/.env`):
```bash
CONNECTION_STRING=ys://127.0.0.1:8080  # Y-Sweet server URL
PORT=3001                               # Auth server port
```

**Client** (`client/.env`):
```bash
VITE_Y_SWEET_AUTH_ENDPOINT=http://localhost:3001/api/auth
VITE_DOC_ID=superdoc-example-room
```

### Persisting Data

By default, Y-Sweet stores data in memory. To persist to disk:
```bash
npx y-sweet@latest serve ./data
```

## Resources

- [Y-Sweet Documentation](https://docs.jamsocket.com/y-sweet)
- [Y-Sweet GitHub](https://github.com/jamsocket/y-sweet)
- [Y-Sweet SDK Reference](https://docs.y-sweet.dev/)
