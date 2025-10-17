# SuperDoc AI Controller

`@harbour-enterprises/superdoc-ai-controller` centralizes AI-assisted commands for SuperDoc editors. It ships with ready-to-use providers, lifecycle events, and streaming helpers so TipTap-compatible editors can light up AI-assisted authoring with minimal wiring.

## Installation

```bash
npm install @harbour-enterprises/superdoc-ai-controller
```

## Quick start

```js
import { SuperDocAiController } from '@harbour-enterprises/superdoc-ai-controller';

const editor = createSuperDocEditor({
  extensions: [...],
  content: '<p>Hello world</p>',
  ai: {
    endpoint: 'https://api.example.com/insights',
    apiKey: process.env.SUPERDOC_INSIGHTS_TOKEN,
  },
});

// Auto-infers the Insights provider because endpoint/apiKey are present.
const aiController = new SuperDocAiController({ editor });

await aiController.aiGenerateContent('append an executive summary to the current section');
await aiController.aiRewriteSelection('simplify the selected paragraph');
const matches = await aiController.aiFindContents('definition of scope of work');
```

The controller resolves providers in this order:

1. Provider explicitly passed to a command (e.g., `aiGenerateContent(prompt, customProvider)`).
2. Provider set via `controller.setProvider(...)`.
3. Provider configured on the editor instance (`editor.options.ai.provider`).
4. Auto-created provider derived from `editor.options.ai` (inspects insights/configurable settings).

## Provider options

- **Insights provider** – Use SuperDoc Insights by providing `endpoint`, `apiKey`, or related credentials. The controller will instantiate `InsightsAIProvider` automatically.
- **Configurable provider** – Supply `endpoint`, `buildRequest`, `parseResponse`, and (optionally) `parseStreamChunk` to adapt any JSON API without writing a custom class.
- **Custom provider** – Implement `AIProviderInterface` to hook up bespoke backends.

```js
import { ConfigurableAIProvider, SuperDocAiController } from '@harbour-enterprises/superdoc-ai-controller';

const provider = new ConfigurableAIProvider({
  endpoint: 'https://llm.example.com/v1/completions',
  headers: { Authorization: `Bearer ${process.env.LLM_TOKEN}` },
  model: 'my-company-model',
  buildRequest(method, payload, { documentXml }) {
    return {
      model: this.model,
      stream: method.endsWith('Streaming'),
      prompt: payload.prompt ?? payload.text,
      metadata: { documentXml },
    };
  },
  parseResponse(data) {
    return data.result;
  },
  parseStreamChunk(chunk) {
    const message = JSON.parse(chunk);
    return message.delta;
  },
});

const controller = new SuperDocAiController({ editor, provider });
```

If you need full control, extend `AIProviderInterface` and provide concrete implementations for `findContent`, `findContents`, `write`, `writeStreaming`, `rewrite`, `rewriteStreaming`, and `change`.

## Controller API

- `aiGenerateContent(prompt, provider?, streaming?)` – Inserts generated content at the current cursor/selection.
- `aiRewriteSelection(instructions, provider?, streaming?)` – Replaces the current selection with AI-authored text.
- `aiFindContent(prompt, provider?)` / `aiFindContents(prompt, provider?)` – Returns matches from the document context.
- `aiFindAndSelect(prompt, provider?)` – Finds matches and updates editor selection using search helpers.
- `aiChange(config, provider?)` – Applies tracked changes, inline replacements, comments, or custom handlers based on provider output.
- `setProvider(provider)` – Swap providers at runtime (helpful for tests or feature toggles).
- `resolveProvider(provider?)` – Determine the effective provider (exposed for advanced use cases).

Pass `streaming = true` to `aiGenerateContent` and `aiRewriteSelection` to opt into chunked updates. During streaming, the controller emits `ai:chunk` events and writes partial output into the editor.

### Example: Tracked change from AI output

```js
await aiController.aiChange({
  prompt: 'replace the term "agreement" with "contract"',
  action: 'insert_tracked_change',
  author: { display_name: 'AI Assistant' },
});
```

## Events

The controller mirrors lifecycle events via the editor instance so you can attach analytics or UI affordances:

- `ai:command:start` – Command entry (payload includes the command name and prompt/instructions).
- `ai:command:complete` – Fired when a command succeeds.
- `ai:command:error` – Fired when a provider throws.
- `ai:chunk` – Streaming chunk emitted while writing.
- `ai:stream:complete` – Signaled after the final stream chunk.

```js
editor.on('ai:command:error', ({ command, error }) => {
  toast.error(`AI ${command} failed: ${error.message}`);
});
```

## Testing tips

- Mock `AIProviderInterface` to assert command behavior without real network calls.
- Use `setProvider` to swap between mock and live providers in integration scenarios.
- Run `npm run test --workspace=packages/superdoc-ai-controller` to execute the Vitest suite.
