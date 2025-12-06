# Collaboration in Production Example

A real-time collaboration example using SuperDoc and Y.js WebSocket synchronization.

## Overview

This example demonstrates:
- **Real-time collaboration** with multiple users editing the same document
- **User presence** showing who's currently editing
- **WebSocket synchronization** using Y.js
- **Image upload** with synchronized media handling

## Architecture

```
┌─────────────────┐         WebSocket          ┌─────────────────┐
│                 │◄──────────────────────────►│                 │
│  Client (Vue)   │         Y.js sync          │  Server         │
│  + SuperDoc     │                            │  (Fastify)      │
│                 │                            │                 │
└─────────────────┘                            └─────────────────┘
```

**Client**: Vue 3 application with SuperDoc editor and Y.js WebSocket provider
**Server**: Fastify server with WebSocket support for Y.js synchronization

**Note**: This example does not persist documents. All collaboration is in-memory and ephemeral. Documents reset when the server restarts.

## Quick Start

From this directory, run:

```bash
npm install
npm run dev
```

This will:
1. Install dependencies for both client and server
2. Start the server on http://localhost:3050
3. Start the client on http://localhost:5173

Open http://localhost:5173 in your browser. Open multiple tabs or share the URL to test collaboration.

## Testing Collaboration

1. Open http://localhost:5173 in multiple browser tabs
2. Each tab will connect as a different user (randomly generated)
3. Start typing in one tab - changes appear in all tabs in real-time
4. See user presence indicators showing who's editing
5. Upload images - they sync across all connected clients

## Project Structure

```
collaboration-in-production/
├── client/              # Vue 3 frontend
│   ├── src/
│   │   ├── DocumentEditor.vue    # Main editor component
│   │   ├── Health.vue            # Server health check
│   │   ├── router.js             # Vue Router config
│   │   └── App.vue               # Root component
│   └── package.json
├── server/              # Fastify backend
│   ├── index.ts                  # Server entry point
│   ├── userGenerator.ts          # Random user identity generator
│   ├── storage.ts                # Storage interface (no-op)
│   └── package.json
└── package.json         # Root orchestration
```

## How It Works

### Server
- Fastify server with `@fastify/websocket` for WebSocket support
- Uses `@superdoc-dev/superdoc-yjs-collaboration` to manage Y.js document rooms
- Assigns random user identities (adjective + animal + ID)
- No persistence - all documents exist in memory only

### Client
- SuperDoc editor initialized with Y.js binding
- WebSocket provider connects to server for real-time sync
- User presence UI shows connected collaborators
- Image uploads synchronized via Y.js media map

### Synchronization Flow
1. Client creates Y.js document and connects WebSocket provider
2. Server manages document state and broadcasts updates to all connected clients
3. Y.js handles CRDT-based conflict resolution automatically
4. Changes propagate in real-time to all connected clients

## Extending This Example

To add persistence, you could:
- Store Y.js document updates in a database (PostgreSQL, Redis, etc.)
- Implement the storage interface in [server/storage.ts](server/storage.ts)
- Convert Y.js documents to/from your preferred format (DOCX, JSON, etc.)

For production use, consider:
- Authentication and authorization
- Document access control
- Rate limiting
- Monitoring and logging
- Horizontal scaling with shared state (Redis, etc.)

## Environment Variables

### Server (.env)
```
PORT=3050                # Server port (default: 3050)
```

### Client (.env)
```
VITE_API_URL=http://localhost:3050    # Server HTTP URL
VITE_WS_URL=ws://localhost:3050       # Server WebSocket URL
```

## Troubleshooting

**Connection refused**: Ensure the server is running on port 3050
**Changes not syncing**: Check browser console for WebSocket errors
**Port already in use**: Change `PORT` in server/.env

## License

See the main SuperDoc repository for license information.
