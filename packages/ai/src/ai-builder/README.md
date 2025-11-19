# SuperDoc AI Builder

Low-level primitives for building custom AI workflows with SuperDoc.

## Overview

AI Builder provides the foundational components for creating AI-powered document editing experiences. Unlike AI Actions which offers pre-built operations, AI Builder gives you the tools to build custom workflows tailored to your specific needs.

**Alpha Status:** Currently supports Anthropic Claude only.

## Architecture

```
ai-builder/
├── types.ts              # Core type definitions
├── executor.ts           # Tool execution primitive (executeTool)
├── tools/                # Core tool implementations
│   ├── insertContent.ts
│   └── replaceContent.ts
├── providers/            # Provider-specific tool schemas
│   └── anthropic.ts      # Anthropic Claude support
└── schema-generator/     # Schema generation from extensions
    └── from-extensions.ts
```

## Quick Start

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

## Core Concepts

### Tools

Tools are the basic operations that AI can perform on documents:

- **insertContent** - Insert content at selection, documentStart, or documentEnd
- **replaceContent** - Replace content in a specific range

Each tool executes with type-safe parameters and returns a structured result.

### Tool Execution

```typescript
import { executeTool } from '@superdoc-dev/ai';

// Execute a single tool
const result = await executeTool(
  'insertContent',
  {
    position: 'selection',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
  },
  editor,
);

if (result.success) {
  console.log('Content inserted successfully');
}
```

### Schema Generation

Generate tool definitions compatible with Anthropic Claude:

```typescript
import { anthropicTools } from '@superdoc-dev/ai';

// Get tool definitions from extensions
const tools = anthropicTools(editor.extensionManager.extensions, {
  excludedNodes: ['bulletList', 'orderedList'],
  excludedMarks: [],
  strict: true,
});
```

## Available Tools

### insertContent

Insert content at a specific position.

**Parameters:**

- `position`: 'selection' | 'documentStart' | 'documentEnd'
- `content`: Array of ProseMirror nodes

```typescript
await executeTool(
  'insertContent',
  {
    position: 'selection',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Hello World' }],
      },
    ],
  },
  editor,
);
```

### replaceContent

Replace content in a specific range.

**Parameters:**

- `from`: Start position (number)
- `to`: End position (number)
- `content`: Array of ProseMirror nodes

```typescript
await executeTool(
  'replaceContent',
  {
    from: 0,
    to: 100,
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'New content' }],
      },
    ],
  },
  editor,
);
```

## Anthropic Integration

AI Builder is optimized for Anthropic Claude with structured outputs:

```typescript
import { anthropicTools, executeTool } from '@superdoc-dev/ai';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const tools = anthropicTools(editor.extensionManager.extensions);

async function processUserRequest(userMessage: string) {
  const response = await anthropic.beta.messages.create({
    model: 'claude-sonnet-4-5',
    betas: ['structured-outputs-2025-11-13'],
    tools,
    messages: [{ role: 'user', content: userMessage }],
  });

  for (const block of response.content) {
    if (block.type === 'tool_use') {
      const result = await executeTool(block.name, block.input, editor);
      console.log(`Tool ${block.name}:`, result.success ? 'Success' : 'Failed');
    }
  }
}

await processUserRequest('Add a paragraph saying "Hello World"');
```

## Comparison with AI Actions

| Feature         | AI Builder           | AI Actions           |
| --------------- | -------------------- | -------------------- |
| **Use Case**    | Custom workflows     | Pre-built operations |
| **Complexity**  | Low-level primitives | High-level methods   |
| **Flexibility** | Maximum              | Fixed operations     |
| **Setup**       | More code required   | Minimal setup        |
| **Best For**    | Advanced use cases   | Quick integration    |

## Related

- [AI Actions](../ai-actions.ts) - High-level AI operations
- [SuperDoc Docs](https://docs.superdoc.dev/ai/ai-builder/overview)
