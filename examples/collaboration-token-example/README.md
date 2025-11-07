# SuperDoc Token Collaboration Example

Spin up a minimal SuperDoc instance that requests a collaboration token from the SuperDoc API and connects to the WebSocket using that token as the room identifier. This showcases the new `/v1/collaboration/tokens` endpoint and how tokens become the only public handle for a document.

## Prerequisites

- SuperDoc API running locally (see `SuperDoc-API/README.md`)  
  - Ensure `COLLABORATION_DOCUMENT_EXPIRY_MS` is long enough for your tests or wire persistence.
- A valid SuperDoc API key (register via `/v1/auth/register` and `/v1/auth/verify`).
- Node.js 20+ and `pnpm` available on your path.

## Getting Started

```bash
cd superdoc/examples/collaboration-token-example
pnpm install
pnpm dev
```

Open the printed Vite URL (defaults to [http://localhost:5173](http://localhost:5173)).

1. Enter your SuperDoc API base URL (defaults to `http://localhost:3000`).
2. Paste your API key.
3. Optionally tweak the display name that shows up in presence lists.
4. Click **Create token & connect**.

The page will:

1. `POST /v1/collaboration/tokens` to obtain a new share token.
2. Display the returned token / document pair.
3. Boot the SuperDoc editor and connect to `ws(s)://{api}/v1/collaboration/ws/{token}` with your user + session metadata.

Share the printed token with another client running the same demo (or connect with `wscat`) to see live collaboration.

## Customising

- Want to point at a remote API? Change the base URL field before connecting.
- Need HTTPS? If the base URL starts with `https://`, the example automatically upgrades the WebSocket to `wss://`.
- Curious about the underlying code? Check `src/main.js` for the token request and SuperDoc configuration.

Happy collaborating! 🥷
