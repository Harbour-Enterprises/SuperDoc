# SuperDoc + TipTap Cloud

Real-time collaboration using [TipTap Cloud](https://cloud.tiptap.dev/) (managed Hocuspocus).

**Note:** Requires TipTap Pro subscription and access to their private npm registry.

## Setup

1. **Create `.npmrc`** from `.npmrc.example` with your NPM token from TipTap Cloud Settings

2. **Create `.env`** from `.env.example`:
   ```
   VITE_TIPTAP_APP_ID=your-app-id
   VITE_TIPTAP_TOKEN=your-jwt-token
   ```

3. **Install and run**
   ```bash
   pnpm install
   pnpm dev
   ```

4. Open http://localhost:3000 in multiple tabs

## How It Works

```ts
import { TiptapCollabProvider } from '@tiptap-pro/provider';
import * as Y from 'yjs';

const ydoc = new Y.Doc();
const provider = new TiptapCollabProvider({
  appId: 'your-app-id',
  name: 'room-id',
  document: ydoc,
  token: 'your-token',
});

new SuperDoc({
  modules: {
    collaboration: { ydoc, provider },
  },
});
```

## Self-Hosted Alternative

For self-hosted deployments, see the [hocuspocus example](../../self-hosted/hocuspocus/).
