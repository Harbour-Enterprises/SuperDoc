# SuperDoc + Y-Sweet Example

This example demonstrates how to use SuperDoc with [Y-Sweet](https://y-sweet.dev) for real-time collaboration.

## Setup

### 1. Create a Y-Sweet Service

1. Go to [app.jamsocket.com](https://app.jamsocket.com) and create an account
2. Create a new Y-Sweet service
3. Generate a connection string and copy it

### 2. Configure the Example

Edit `src/main.js` and set your connection string:

```javascript
const YSWEET_CONNECTION_STRING = 'yss://your-service-id.ysweet.jamsocket.live';
```

Or, for production, set up an auth endpoint (see below).

### 3. Install and Run

```bash
npm install
npm run dev
```

Open http://localhost:5173 in multiple browser windows to test collaboration.

## Production Setup

For production, you should use an auth endpoint instead of exposing your connection string:

### Backend (Node.js/Express example)

```javascript
import { DocumentManager } from '@y-sweet/sdk';
import express from 'express';

const app = express();
const manager = new DocumentManager(process.env.YSWEET_CONNECTION_STRING);

app.post('/api/ysweet-auth', async (req, res) => {
  const { docId } = req.body;
  const clientToken = await manager.getOrCreateDocAndToken(docId);
  res.json(clientToken);
});
```

### Frontend

```javascript
const AUTH_ENDPOINT = '/api/ysweet-auth';
const provider = await createYjsProvider(ydoc, docId, AUTH_ENDPOINT);
```

## How It Works

1. **Y-Sweet Provider**: We create a Y-Sweet provider that handles the WebSocket connection, sync, and persistence
2. **Custom Provider**: We pass the provider and ydoc to SuperDoc via `modules.collaboration.customProvider`
3. **SuperDoc**: Automatically wires up awareness (user presence) and uses the provider for document sync

## Files

- `src/main.js` - Main application code with Y-Sweet setup
- `index.html` - HTML template with status indicator
- `vite.config.js` - Vite configuration

## Troubleshooting

**"Failed to connect to Y-Sweet"**
- Check your connection string is correct
- Ensure your Y-Sweet service is running
- Check browser console for detailed errors

**Users not seeing each other's changes**
- Verify both users are using the same `DOC_ID`
- Check the connection status indicator
- Look for WebSocket errors in the console
