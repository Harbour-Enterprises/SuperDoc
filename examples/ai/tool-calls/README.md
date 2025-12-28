# SuperDoc AI Quickstart

Launch a live SuperDoc editor with AI helpers. This example shows how to wire up
`@superdoc-dev/ai` with a fresh SuperDoc instance, register a few buttons, and stream results back into the
document.

## Prerequisites

- Node.js 18+
- An OpenAI API key (or update the provider section in `src/main.js` for another provider)

## Run the demo

```bash
cd examples/ai/quickstart
cp .env.example .env               # add your OpenAI key + preferred model
npm install
npm run dev
```

Vite will print a local URL (defaults to <http://localhost:5173>). Open it in your browser and use the action chips at
the top of the editor to generate, locate, or revise content while the status pill reports progress.

## What this example covers

- creating a SuperDoc instance with a ready-to-edit document
- initializing `AIActions` after the editor mounts
- streaming UI feedback via the built-in callbacks
- wiring multiple AI actions (`insertContent`, `insertTrackedChange`, `highlight`, `replace`, `replaceAll`, `find`,
  `findAll`, `insertComment`, `insertComments`) through a shared handler
- safely handling missing API keys and error states

## Key files

- `src/main.js` – core integration logic
- `src/style.css` – quick styling for the layout and status panel
- `.env.example` – environment variables expected by the example

## Switching providers

OpenAI is used here, but you can swap in another provider by changing the `provider` block inside
`initializeAI()` in `src/main.js`. For example, to call a custom HTTP endpoint:

```js
aiInstance = new AIActions(superdoc, {
  user: { displayName: 'SuperDoc AI Assistant' },
  provider: {
    type: 'http',
    url: import.meta.env.VITE_AI_HTTP_URL,
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_AI_HTTP_TOKEN}`
    }
  }
});
```

Restart the dev server after updating environment variables so Vite can pick them up.
