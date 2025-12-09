# SuperDoc + Liveblocks Example

This example demonstrates using SuperDoc with [Liveblocks](https://liveblocks.io) as a cloud collaboration provider.

## Setup

1. **Get your Liveblocks API key**
   - Create an account at [liveblocks.io](https://liveblocks.io)
   - Get your **public API key** from the [dashboard](https://liveblocks.io/dashboard) (starts with `pk_`)

2. **Create `.env` file**
   ```bash
   cp .env.example .env
   # Edit .env and add your key
   ```

3. **Install dependencies**
   ```bash
   pnpm install
   ```

4. **Run the example**
   ```bash
   pnpm dev
   ```

5. Open http://localhost:3000 in multiple browser tabs to test collaboration

## How It Works

```js
import { createClient } from '@liveblocks/client';
import { LiveblocksYjsProvider } from '@liveblocks/yjs';
import * as Y from 'yjs';

// 1. Create client and enter room
const client = createClient({ publicApiKey: 'pk_...' });
const { room } = client.enterRoom('my-room');

// 2. Create Y.Doc and provider
const ydoc = new Y.Doc();
const provider = new LiveblocksYjsProvider(room, ydoc);

// 3. Pass to SuperDoc
new SuperDoc({
  selector: '#superdoc',
  modules: {
    collaboration: {
      ydoc,
      provider,
    },
  },
});
```

## Resources

- [Liveblocks Yjs Guide](https://liveblocks.io/docs/products/yjs)
- [LiveblocksYjsProvider API](https://liveblocks.io/docs/api-reference/liveblocks-yjs)
