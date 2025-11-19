# @superdoc-dev/ai

> AI integration package for SuperDoc - Add powerful AI capabilities to your document editor

## Features

- **AI Actions**: High-level API for common document operations (find, replace, insert, comment)
- **AI Builder**: Low-level primitives for custom AI workflows
- **Anthropic Support**: Built-in Anthropic Claude integration
- **Comment Integration**: Automatically insert AI-generated comments
- **Track Changes**: AI suggestions with full revision history
- **TypeScript First**: Full type safety and excellent IDE support

## Installation

```bash
npm install @superdoc-dev/ai
```

## Quick Start

### Using AI Actions (High-Level API)

```typescript
import { AIActions } from '@superdoc-dev/ai';

// Initialize with Anthropic
const ai = new AIActions(superdoc, {
  user: {
    displayName: 'AI Assistant',
    userId: 'ai-bot-001',
  },
  provider: {
    type: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-5',
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

### Using AI Builder (Low-Level API)

```typescript
import { executeTool, anthropicTools } from '@superdoc-dev/ai';
import Anthropic from '@anthropic-ai/sdk';

// Get tool definitions
const tools = anthropicTools(editor.extensionManager.extensions);

// Use with Anthropic SDK
const anthropic = new Anthropic({ apiKey: '...' });
const response = await anthropic.beta.messages.create({
  model: 'claude-sonnet-4-5',
  betas: ['structured-outputs-2025-11-13'],
  tools,
  messages: [{ role: 'user', content: 'Add a paragraph saying hello' }],
});

// Execute tool calls
for (const toolUse of response.content.filter((c) => c.type === 'tool_use')) {
  await executeTool(toolUse.name, toolUse.input, editor);
}
```

## API Overview

### AI Actions

High-level API for common document operations:

- `find(query)` - Find content matching a query
- `findAll(query)` - Find all occurrences
- `highlight(query, color?)` - Find and highlight
- `replace(instruction)` - Replace first occurrence
- `replaceAll(instruction)` - Replace all occurrences
- `insertTrackedChange(instruction)` - Insert single tracked change
- `insertTrackedChanges(instruction)` - Insert multiple tracked changes
- `insertComment(instruction)` - Insert single comment
- `insertComments(instruction)` - Insert multiple comments
- `summarize(instruction)` - Generate summary
- `insertContent(instruction)` - Generate and insert content

### AI Builder

Low-level primitives for custom workflows:

- `anthropicTools(extensions, options?)` - Generate Anthropic tool definitions
- `executeTool(toolName, params, editor)` - Execute a tool call
- `generateContentSchema(extensions, options?)` - Generate content schema
- Core types and utilities

## Provider Configuration

### Anthropic Claude

```typescript
const ai = new AIActions(superdoc, {
  user: { displayName: 'AI' },
  provider: {
    type: 'anthropic',
    apiKey: 'sk-ant-...',
    model: 'claude-sonnet-4-5',
    temperature: 0.7, // optional
    maxTokens: 2000, // optional
  },
});
```

## Advanced Usage

### Custom System Prompt

```typescript
const ai = new AIActions(superdoc, {
  user: { displayName: 'Legal AI' },
  provider: { type: 'anthropic', apiKey: '...', model: 'claude-sonnet-4-5' },
  systemPrompt: `You are a legal document assistant.
    Focus on accuracy, clarity, and compliance.`,
});
```

### With Callbacks

```typescript
const ai = new AIActions(superdoc, {
  user: { displayName: 'AI' },
  provider: { type: 'anthropic', apiKey: '...', model: 'claude-sonnet-4-5' },
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

## License

AGPL-3.0 - see [LICENSE](../../LICENSE) for details.

## Support

- 📖 [Documentation](https://superdoc.dev/docs/ai)
- 💬 [Discord Community](https://discord.gg/superdoc)
- 🐛 [Issue Tracker](https://github.com/harbour-enterprises/superdoc/issues)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.
