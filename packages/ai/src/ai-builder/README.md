# SuperDoc AI Builder

Low-level primitives for building custom AI workflows with SuperDoc.

## Overview

AI Builder provides the foundational components for creating AI-powered document editing experiences. Unlike AI Actions which offers pre-built operations, AI Builder gives you the tools to build custom workflows tailored to your specific needs.

**Supported Providers:**

- ✅ Anthropic Claude (with structured outputs)
- ✅ OpenAI GPT-4 (with function calling)
- ✅ Any custom provider (with text-based fallback)

## Architecture

```
ai-builder/
├── types.ts                 # Core type definitions
├── execution/               # Tool execution
│   ├── executor.ts          # Tool execution primitive (executeTool)
│   └── text-parser.ts       # Text-based fallback parser
├── tools/                   # Core tool implementations
│   ├── insertContent.ts
│   ├── replaceContent.ts
│   └── searchDocument.ts
├── providers/               # Provider-specific tool schemas
│   ├── anthropic.ts         # Anthropic Claude support
│   └── openai.ts            # OpenAI GPT-4 support
├── schema/                  # Schema generation and validation
│   ├── schema-generator.ts  # Generate schemas from editor
│   ├── schema-optimizer.ts  # Optimize schemas
│   └── schema-validator.ts  # Validate content
└── utils/                   # Utility functions
    └── editor-readiness.ts  # Editor readiness checks
```

## Quick Start

```typescript
import { executeTool, anthropicTools } from '@superdoc-dev/ai';
import Anthropic from '@anthropic-ai/sdk';

// Get tool definitions (now async - uses editor.getSchemaSummaryJSON())
const tools = await anthropicTools(editor);

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

### Dynamic Schema Generation

Tool definitions are now generated dynamically from the editor's schema using `editor.getSchemaSummaryJSON()`:

```typescript
import { anthropicTools, generateContentSchema } from '@superdoc-dev/ai';

// Get tool definitions with dynamic schema (async)
const tools = await anthropicTools(editor, {
  excludedNodes: ['doc', 'table'], // Exclude specific nodes
  excludedMarks: ['trackInsert'], // Exclude specific marks
  enabledTools: ['insertContent'], // Only enable specific tools
});

// Or generate schema separately
const contentSchema = await generateContentSchema(editor, {
  excludedNodes: ['doc'],
  excludedMarks: [],
  includeDescriptions: true,
});
```

**Benefits:**

- ✅ No hardcoded schema - automatically supports all your extensions
- ✅ Native support for headings, lists, tables, images, etc.
- ✅ Automatically includes all your custom nodes and marks
- ✅ Updates when you add/remove extensions

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

// Generate tools dynamically from editor schema (async)
const tools = await anthropicTools(editor);

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

await processUserRequest('Add a heading that says "Hello World"');
// AI can now generate native heading nodes instead of paragraphs with styleId!
```

## OpenAI Integration

Works seamlessly with OpenAI's function calling:

```typescript
import { openaiTools, executeTool } from '@superdoc-dev/ai';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Generate tools dynamically from editor schema (async)
const tools = await openaiTools(editor);

const response = await openai.chat.completions.create({
  model: 'gpt-4-turbo',
  tools,
  messages: [{ role: 'user', content: 'Add a heading that says "Hello World"' }],
});

// Execute tool calls
const message = response.choices[0].message;
if (message.tool_calls) {
  for (const toolCall of message.tool_calls) {
    await executeTool(toolCall.function.name, JSON.parse(toolCall.function.arguments), editor);
  }
}
```

## Text-Based Providers

For providers without structured tool calling (older models, local LLMs, custom APIs):

```typescript
import { parseAndExecute, TEXT_BASED_SYSTEM_PROMPT } from '@superdoc-dev/ai/ai-builder';

// Any provider that returns text
const response = await provider.getCompletion([
  { role: 'system', content: TEXT_BASED_SYSTEM_PROMPT },
  { role: 'user', content: 'Add a header that says "Hello World"' },
]);

// Automatically parse JSON tool calls and execute
const results = await parseAndExecute(response, editor);
```

## Universal Executor

## More Examples

See [EXAMPLES.md](./EXAMPLES.md) for comprehensive examples including:

- Multi-turn conversations
- Custom provider integration
- Error handling
- Advanced patterns

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
