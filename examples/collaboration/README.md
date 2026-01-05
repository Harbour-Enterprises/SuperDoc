# Collaboration Examples

Real-time collaboration examples using Yjs for multi-user document editing.

## Cloud Providers (No Server Required)

| Provider                   | Description                              |
| -------------------------- | ---------------------------------------- |
| [Liveblocks](./liveblocks) | Managed cloud - just add API key         |
| [TipTap Cloud](./tiptap)   | Managed Hocuspocus (requires TipTap Pro) |

## Self-Hosted Examples

| Example                            | Description                                                |
| ---------------------------------- | ---------------------------------------------------------- |
| [Hocuspocus](./hocuspocus)         | Self-hosted Hocuspocus server                              |
| [basic](./basic)                   | Simple collaboration setup with y-websocket                |
| [superdoc](./superdoc)             | Full SuperDoc collaboration with awareness features        |
| [from-scratch](./from-scratch)     | Build collaboration from scratch with client and server    |
| [production](./production)         | Production-ready setup with persistence and authentication |
| [fastify-server](./fastify-server) | Fastify-based collaboration server                         |
| [y-sweet](./y-sweet)               | Y-Sweet collaboration server                               |

## Running an Example

Most collaboration examples require running both a server and client:

```bash
# Terminal 1 - Server
cd <example-folder>/server
npm install
npm run dev

# Terminal 2 - Client
cd <example-folder>/client
npm install
npm run dev
```

See individual example READMEs for specific instructions.
