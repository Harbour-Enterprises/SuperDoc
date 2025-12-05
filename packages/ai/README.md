# @superdoc-dev/ai

> AI integration package for SuperDoc - Add powerful AI capabilities to your document editor

## Features

- 🤖 **Multiple AI Providers**: Built-in support for OpenAI, Anthropic Claude, and custom HTTP endpoints
- 🔍 **Smart Content Finding**: Natural language search across documents
- ✍️ **Intelligent Editing**: AI-powered content replacement, suggestions, and generation
- 💬 **Comment Integration**: Automatically insert AI-generated comments
- 📝 **Track Changes**: AI suggestions with full revision history
- 🎨 **Content Highlighting**: Smart text highlighting based on queries
- 🌊 **Streaming Support**: Real-time AI responses with streaming
- 📦 **TypeScript First**: Full type safety and excellent IDE support

## Installation

```bash
npm install @superdoc-dev/ai
```

## Quick Start

```typescript
import { AIActions } from '@superdoc-dev/ai';

// Initialize with OpenAI
const ai = new AIActions(superdoc, {
  user: {
    displayName: 'AI Assistant',
    userId: 'ai-bot-001',
  },
  provider: {
    type: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
  },
  onReady: ({ aiActions }) => {
    console.log('AI is ready!');
  },
});

// Wait for initialization
await ai.waitUntilReady();

// Find content
const result = await ai.action.find('privacy policy');

// Replace content
await ai.action.replace('change "color" to "colour" in British English');

// Insert tracked changes
await ai.action.insertTrackedChange('improve the introduction');

// Generate content
await ai.action.insertContent('write a conclusion paragraph');
```

## API Reference

### AIActions Class

The main class for AI integration.

#### Constructor

```typescript
new AIActions(superdoc: SuperDocInstance, options: AIActionsOptions)
```

**Options:**

- `user` (required): User/bot information
  - `displayName`: Display name for AI-generated changes
  - `userId?`: Optional user identifier
  - `profileUrl?`: Optional profile image URL
- `provider` (required): AI provider configuration or instance
- `systemPrompt?`: Custom system prompt for AI context
- `enableLogging?`: Enable debug logging (default: false)
- Callbacks:
  - `onReady?`: Called when AI is initialized
  - `onStreamingStart?`: Called when streaming begins
  - `onStreamingPartialResult?`: Called for each streaming chunk
  - `onStreamingEnd?`: Called when streaming completes
  - `onError?`: Called when an error occurs

#### Methods

##### `waitUntilReady()`

Waits for AI initialization to complete.

```typescript
await ai.waitUntilReady();
```

##### `getIsReady()`

Checks if AI is ready.

```typescript
const ready = ai.getIsReady(); // boolean
```

##### `getCompletion(prompt, options?)`

Get a complete AI response.

```typescript
const response = await ai.getCompletion('Summarize this document', {
  temperature: 0.7,
  maxTokens: 500,
});
```

##### `streamCompletion(prompt, options?)`

Stream AI responses in real-time.

```typescript
const result = await ai.streamCompletion('Generate introduction');
```

##### `getDocumentContext()`

Get current document text.

```typescript
const context = ai.getDocumentContext();
```

### AI Actions

All actions are available via `ai.action.*`.

#### `find(query)`

Find the first occurrence of content matching the query.

```typescript
const result = await ai.action.find('GDPR compliance section');
// Returns: { success: boolean, results: FoundMatch[] }
```

#### `findAll(query)`

Find all occurrences of content matching the query.

```typescript
const result = await ai.action.findAll('privacy policy');
```

#### `highlight(query, color?)`

Find and highlight content.

```typescript
await ai.action.highlight('important terms', '#FFFF00');
```

#### `replace(instruction)`

Replace the first occurrence based on instruction.

```typescript
await ai.action.replace('change "data" to "information" in the first paragraph');
```

#### `replaceAll(instruction)`

Replace all occurrences based on instruction.

```typescript
await ai.action.replaceAll('update dates to 2025');
```

#### `insertTrackedChange(instruction)`

Insert a single tracked change.

```typescript
await ai.action.insertTrackedChange('improve clarity of terms and conditions');
```

#### `insertTrackedChanges(instruction)`

Insert multiple tracked changes.

```typescript
await ai.action.insertTrackedChanges('fix all grammatical errors');
```

#### `insertComment(instruction)`

Insert a single comment.

```typescript
await ai.action.insertComment('suggest improvements to introduction');
```

## AIBuilder: Prompt → Plan → Action

When you need low-level control over AI-driven workflows, the `AIBuilder` class lets you turn a natural language prompt into a concrete plan and apply it with formatting-safe primitives.

```ts
import { AIBuilder } from '@superdoc-dev/ai';

const builder = new AIBuilder({
  provider: {
    type: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o-mini',
  },
  editor: superdoc.activeEditor,
  documentContextProvider: () => {
    // Include the current selection when available, otherwise share full text
    const { state } = superdoc.activeEditor;
    return state.doc.textBetween(state.selection.from, state.selection.to || state.doc.content.size, ' ').trim();
  },
  maxContextLength: 8000,
  enableLogging: true,
});

const result = await builder.execute('Add tracked changes that tighten the executive summary.');

console.log(result.executedTools); // e.g. ['insertTrackedChanges', 'respond']
console.log(result.response); // Builder’s textual reply (if any)
```

### AIBuilder Highlights

- **Planning Prompt** – Builder sends the document text, JSON, and schema summary (when available) to the LLM and asks for a JSON plan (`tool`, `instruction`).
- **Tool Registry** – Built-in tools cover find/highlight, replace (single/all), tracked changes, comments, summaries, content insertion, and a `respond` fallback. You can inject your own tool definitions if needed.
- **Formatting Preservation** – Every editing tool is backed by the `EditorAdapter`, which maintains marks and inline styling via `replaceText`, tracked changes, and comment helpers.
- **Execution Results** – `execute` returns whether the run succeeded, which tools ran, any textual response, the parsed plan, and warnings for skipped steps.

Use `AIBuilder` when you want prompt → plan → action orchestration (redlining, drafting, reviews) while keeping full control over the resulting document edits.

#### `insertComments(instruction)`

Insert multiple comments.

```typescript
await ai.action.insertComments('review all legal terms');
```

#### `summarize(instruction)`

Generate a summary.

```typescript
const result = await ai.action.summarize('create executive summary');
// onStreamingPartialResult receives partial updates when the provider allows streaming.
```

#### `insertContent(instruction)`

Generate and insert new content.

```typescript
await ai.action.insertContent('write a conclusion paragraph');
```

When the provider configuration leaves `streamResults` enabled (default), generated content streams into the document incrementally instead of waiting for the full response.

## AI Providers

### OpenAI

```typescript
const ai = new AIActions(superdoc, {
  user: { displayName: 'AI' },
  provider: {
    type: 'openai',
    apiKey: 'sk-...',
    model: 'gpt-4',
    baseURL: 'https://api.openai.com/v1', // optional
    organizationId: 'org-...', // optional
    temperature: 0.7, // optional
    maxTokens: 2000, // optional
    streamResults: false, // optional (applies to AI insert/summarize actions; default true)
  },
});
```

### Anthropic Claude

```typescript
const ai = new AIActions(superdoc, {
  user: { displayName: 'AI' },
  provider: {
    type: 'anthropic',
    apiKey: 'sk-ant-...',
    model: 'claude-3-opus-20240229',
    apiVersion: '2023-06-01', // optional
    baseURL: 'https://api.anthropic.com', // optional
    temperature: 0.7, // optional
    maxTokens: 2000, // optional
    streamResults: false, // optional (applies to AI insert/summarize actions; default true)
  },
});
```

### Custom HTTP Provider

```typescript
const ai = new AIActions(superdoc, {
  user: { displayName: 'AI' },
  provider: {
    type: 'http',
    url: 'https://your-ai-api.com/complete',
    streamUrl: 'https://your-ai-api.com/stream', // optional
    headers: {
      Authorization: 'Bearer token',
      'X-Custom-Header': 'value',
    },
    method: 'POST', // default
    streamResults: true, // optional (used by insertContent/summarize; default true)
    buildRequestBody: (context) => ({
      messages: context.messages,
      stream: context.stream,
      // custom fields
    }),
    parseCompletion: (payload) => {
      // Extract text from response
      return payload.result;
    },
  },
});
```

### Custom Provider Instance

Implement the `AIProvider` interface:

```typescript
const customProvider: AIProvider = {
  streamResults: true,
  async *streamCompletion(messages, options) {
    // Yield chunks
    yield 'chunk1';
    yield 'chunk2';
  },
  async getCompletion(messages, options) {
    // Return complete response
    return 'response';
  },
};

const ai = new AIActions(superdoc, {
  user: { displayName: 'AI' },
  provider: customProvider,
});
```

## Advanced Usage

### With Callbacks

```typescript
const ai = new AIActions(superdoc, {
  user: { displayName: 'AI' },
  provider: { type: 'openai', apiKey: '...', model: 'gpt-4' },
  enableLogging: true,
  onReady: () => console.log('Ready!'),
  onStreamingStart: () => console.log('Streaming started'),
  onStreamingPartialResult: ({ partialResult }) => {
    console.log('Partial:', partialResult);
  },
  onStreamingEnd: ({ fullResult }) => {
    console.log('Complete:', fullResult);
  },
  onError: (error) => {
    console.error('Error:', error);
  },
});
```

### Custom System Prompt

```typescript
const ai = new AIActions(superdoc, {
  user: { displayName: 'Legal AI' },
  provider: { type: 'openai', apiKey: '...', model: 'gpt-4' },
  systemPrompt: `You are a legal document assistant. 
    Focus on accuracy, clarity, and compliance.
    Always cite relevant regulations when applicable.`,
});
```

### Abort Streaming

```typescript
const controller = new AbortController();

ai.streamCompletion('Long task', {
  signal: controller.signal,
});

// Later...
controller.abort();
```

### Provider-Specific Options

```typescript
await ai.getCompletion('prompt', {
  temperature: 0.5,
  maxTokens: 1000,
  stop: ['\n\n'],
  providerOptions: {
    // OpenAI specific
    top_p: 0.9,
    frequency_penalty: 0.5,
    // or Anthropic specific
    top_k: 40,
  },
});
```

## Error Handling

```typescript
try {
  await ai.action.replace('make changes');
} catch (error) {
  if (error.message.includes('not ready')) {
    await ai.waitUntilReady();
    // Retry
  } else {
    console.error('AI operation failed:', error);
  }
}
```

## Testing

```bash
npm test
```

## License

AGPL-3.0 - see [LICENSE](../../LICENSE) for details.

## Support

- 📖 [Documentation](https://superdoc.dev/docs/ai)
- 💬 [Discord Community](https://discord.gg/superdoc)
- 🐛 [Issue Tracker](https://github.com/harbour-enterprises/superdoc/issues)
- 📧 [Email Support](mailto:support@superdoc.dev)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.
