# SuperDoc + Hocuspocus (Self-Hosted)

Real-time collaboration using self-hosted [Hocuspocus](https://hocuspocus.dev/) server.

## Quick Start

```bash
pnpm install
pnpm dev
```

This starts both the server (ws://localhost:1234) and client (http://localhost:3000).

Open http://localhost:3000 in multiple tabs to test collaboration.

## Manual Setup (Alternative)

If you prefer running separately:

```bash
# Terminal 1 - Server
cd server && pnpm install && pnpm dev

# Terminal 2 - Client
cd client && pnpm install && pnpm dev
```

## How It Works

```ts
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

const ydoc = new Y.Doc();
const provider = new HocuspocusProvider({
  url: 'ws://localhost:1234',
  name: 'room-id',
  document: ydoc,
});

new SuperDoc({
  modules: {
    collaboration: { ydoc, provider },
  },
});
```

## Adding Persistence

To persist documents, add the Database extension to the server:

```bash
pnpm add @hocuspocus/extension-database level
```

```js
import { Database } from '@hocuspocus/extension-database';
import { Level } from 'level';

const db = new Level('./data');

const server = new Server({
  port: 1234,
  extensions: [
    new Database({
      fetch: async ({ documentName }) => {
        try { return await db.get(documentName); }
        catch { return null; }
      },
      store: async ({ documentName, state }) => {
        await db.put(documentName, state);
      },
    }),
  ],
});
```

## Managed Alternative

For managed hosting, see [TipTap Cloud](../cloud/tiptap/).
