# Collaboration

Learn how to set-up ```SuperDoc``` for **real-time collaboration** in the frontend and backend.

## Frontend setup
Simply add the ```collaboration``` configuration object to your **SuperDoc** modules config.

```
modules: {
  // ...other module config
  collaboration: {
    url: 'wss://your-collaboration-server.com', // Required: Path to your collaboration backend
    token: 'your-auth-token',                   // Optional: Your auth token
  }
}
```
:::info :bulb: If your server is in the same domain as your frontend, and you set it up to accept credentials, you can pass in ```cookies``` directly as well, in which case the ```token``` key is not required.
:::

## Backend Setup

# The SuperDoc Yjs collaboration library

`@harbour-enterprises/superdoc-yjs-collaboration` is a library for integrating Yjs-based real-time collaborative editing into any Node.js WebSocket-enabled server framework. It is designed to work out-of-the-box for **SuperDoc**.

It provides:

* **CRDT**-based document synchronization with Yjs
* **WebSocket** compatibility via `y-websocket` utilities
* **Configurable hooks** for authentication, loading initial state, persistence, and change events
* **Debounced persistence** to control write frequency
* **Co-Presence (Awareness)** support through `y-protocols/awareness`

---

## Features

* **Fluent builder API**: chainable methods to configure name, debounce, hooks, and extensions.
* **Framework-agnostic**: can be used with Fastify, Express, Koa, or any WebSocket-capable HTTP server.
* **Pluggable hooks**: `onAuthenticate`, `onLoad`, `onAutoSave`, `onChange`, plus custom extensions.
* **Debounced persistence**: built-in support for batching state saves.
* **Awareness & co-presence**: optional user presence through built-in Awareness support.
* **TypeScript & JSDoc**: fully documented via JSDoc for IDEs and TS consumption.

The way clients connect to your server is via websockets. You must have a NodeJS server with a websocket endpoint available.

:::info Data flow
```
Client <-> WebSocket <-> Your Server <-> sueprdoc-yjs-collaboration <-> Yjs Doc <-> onLoad/onAutoSave
```
:::

---

## Examples
[See this Fastify example for a complete working setup](https://github.com/Harbour-Enterprises/SuperDoc/tree/develop/packages/collaboration-yjs/examples/fastify)

## Installation

```bash
npm install @harbour-enterprises/superdoc-yjs-collaboration
# or
yarn add @harbour-enterprises/superdoc-yjs-collaboration
```

For local development, link your built package:

```bash
cd superdoc-yjs-collaboration
npm run build
npm link

# in your project
npm link @harbour-enterprises/superdoc-yjs-collaboration
```

---

## Quick start
If you installed & linked, you can run the included **Fastify** example by simply running:
```bash
npm run dev
```

## Quick Start (Example)

Below is an example using Fastify, but you can adapt it to any server framework.

```js
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { v4 as uuidv4 } from 'uuid';
import SuperDocCollaboration from '@harbour-enterprises/superdoc-yjs-collaboration';

const app = Fastify();
app.register(websocket);

/**
 * Hooks
 */
const onAuthenticate = (params) => {}; // Custom auth logic
const onLoad = (params) => {}; // Load your document from persistence (ie: S3)
const onAutoSave = (params) => {}; // Debounced onChange hook based on 'withDebounce' setting. Save to persistence.
const onChange = (params) => {}; // On change hook. This gets triggered a lot!

const service = new SuperDocCollaboration()
  .withName(`sdc-${uuidv4()}`)
  .withDebounce(500)
  .onAuthenticate(onAuthenticate)
  .onLoad(onLoad)
  .onAutoSave(onAutoSave)
  .onChange(onChange)
  .build(); // Finalizes the configuration. Returns a SuperDocCollaboration instance, but does not start a server itself.

app.get(
  '/collaboration/:documentId',
  { websocket: true },
  (socket, request) => service.welcome(socket, request)
);

app.listen({ port: 3000 });
```

See `examples/fastify` for more details

---

## API Reference

### `CollaborationBuilder`

Fluent builder for the collaboration service.

| Method                      | Description                                |
| --------------------------- | ------------------------------------------ |
| `.withName(name: string)`   | Set a unique service identifier.            |
| `.withDebounce(ms: number)` | Debounce interval for persistence (ms).    |
| `.withDocumentExpiryMs(ms: number)` | Time to retain documents in cache when no clients connected (ms).    |
| `.onConfigure(fn)`       | Hook triggered after service is configured      |
| `.onAuthenticate(fn)`       | Hook to authenticate each connection.      |
| `.onLoad(fn)`               | Hook to load document state from storage or database             |
| `.onAutoSave(fn)`              | Hook to persist document state.            |
| `.onChange(fn)`             | Hook for processing Yjs updates.           |
| `.build()`                  | Build and return the `SuperDocCollaboration` |

### `SuperDocCollaboration`

Core engine for handling WebSocket connections and Yjs sync.

| Method                                 | Description                                               |
| -------------------------------------- | --------------------------------------------------------- |
| `.welcome(socket: WebSocket, request)` | Accept a new WS connection and start Yjs synchronization. |

---

# Hooks

## onAuthenticate
:::warning :warning: This hook is not enforced, but all applications should presumably implement this hook
:::

In this hook you want to set up your authentication. The function receives the SuperDocCollaboration instance context as a parameter, which contains information about the original request, headers, as well as the token if one is provided.


:::tip :bulb: Throwing any exception in this hook will automatically prevent any further access for the current client to the current document
:::

## onLoad
This is where you will load the file data from your persistent storage (ie: S3, GCS, database). Most often you should store data in UInt8Array format so you are also most likely restoring in that format.

:::info This function expects to return UInt8Array data
:::

## onAutoSave
This hook is the same as onChange but automatically debounced to either 5 seconds, or whatever you configured via ```.withDebounce()```

You will want to store your data back in your persistent storage here. We recommend storing in UInt8Array format which you can generate from Yjs using:
```
import * as Y from 'yjs';

const myOnAutoSaveHandler = (context) => {
  const { document } = context;
  const stateForStorage = Y.encodeStateAsUpdate(document); // This generates a UInt8Array
  // ... store your UInt8Array here
}
```

# Additional Resources
If you are new to the wonderful **YJS** library, we recommend you read a bit about it here: https://docs.yjs.dev/

## License

AGPL-3.0
