# AI Builder - Low-Level Primitives

Low-level document operation tools for building custom AI workflows with SuperDoc.

## Overview

AI Builder provides direct document manipulation primitives that LLM providers can call. These are stateless operations that execute immediately on the document, giving you full control over the LLM interaction.

## Installation

```bash
npm install @superdoc-dev/ai
```

## Multi-Provider Support

AI Builder supports all major LLM providers with native tool definitions.

### Anthropic Claude

```typescript
import { anthropicTools, executeTool, getDocumentContext } from '@superdoc-dev/ai/ai-builder';
import Anthropic from '@anthropic-ai/sdk';

const tools = anthropicTools();
const context = getDocumentContext(editor, { maxTokens: 4000 });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-5',
  system: `Document:\n${JSON.stringify(context.content)}`,
  tools,
  messages: [{ role: 'user', content: 'Add a heading before the selected paragraph.' }],
});

for (const block of response.content) {
  if (block.type === 'tool_use') {
    await executeTool(block.name, block.input, editor);
  }
}
```

### OpenAI GPT-4

```typescript
import { openaiTools, executeTool, getDocumentContext } from '@superdoc-dev/ai/ai-builder';
import OpenAI from 'openai';

const tools = openaiTools();
const context = getDocumentContext(editor, { maxTokens: 4000 });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: `Document:\n${JSON.stringify(context.content)}` },
    { role: 'user', content: 'Add a heading before the selected paragraph.' },
  ],
  tools,
});

for (const toolCall of response.choices[0]?.message?.tool_calls || []) {
  const args = JSON.parse(toolCall.function.arguments);
  await executeTool(toolCall.function.name, args, editor);
}
```

### Generic / Custom Providers

```typescript
import { genericTools, executeTool } from '@superdoc-dev/ai/ai-builder';

const tools = genericTools();
// Use generic format or convert to your provider's format

const response = await yourAIProvider.chat({
  tools: tools,
  messages: [...]
});

for (const toolCall of response.tool_calls) {
  await executeTool(toolCall.name, toolCall.arguments, editor);
}
```

### Filtering Tools

```typescript
// Only enable specific tools
const tools = openaiTools({
  enabledTools: ['readSelection', 'insertContent', 'replaceContent'],
});
```

## Available Tools (9)

### Read Operations

#### readSelection

Read the currently selected content in the document.

**Parameters:**

- `withContext` (optional): Number of paragraphs to include before/after for context

```typescript
await executeTool('readSelection', { withContext: 2 }, editor);
```

#### readContent

Read content at a specific position range.

**Parameters:**

- `from`: Start position (character offset)
- `to`: End position (character offset)

```typescript
await executeTool('readContent', { from: 0, to: 100 }, editor);
```

#### readSection

Read a specific section by heading or position range.

**Parameters:**

- `heading` (optional): Heading text to find
- `from` (optional): Start position
- `to` (optional): End position

```typescript
await executeTool('readSection', { heading: 'Introduction' }, editor);
```

#### getDocumentOutline

Get document structure (headings and their positions).

```typescript
await executeTool('getDocumentOutline', {}, editor);
```

### Search Operations

#### searchContent

Search for text or patterns in the document.

**Parameters:**

- `query`: Text or pattern to search for
- `caseSensitive` (optional): Case-sensitive search (default: false)
- `regex` (optional): Treat query as regex (default: false)
- `findAll` (optional): Return all matches (default: true)

```typescript
await executeTool(
  'searchContent',
  {
    query: 'privacy policy',
    findAll: true,
  },
  editor,
);
```

### Write Operations

#### insertContent (Enhanced!)

Insert new content with flexible positioning.

**Parameters:**

- `position`: 'selection' | 'beforeSelection' | 'afterSelection' | 'replaceSelection' | 'documentStart' | 'documentEnd' | number
- `content`: Array of paragraph nodes

```typescript
// At cursor
await executeTool(
  'insertContent',
  {
    position: 'selection',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
  },
  editor,
);

// Before selection
await executeTool(
  'insertContent',
  {
    position: 'beforeSelection',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Intro' }] }],
  },
  editor,
);

// After selection
await executeTool(
  'insertContent',
  {
    position: 'afterSelection',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Conclusion' }] }],
  },
  editor,
);

// At specific position
await executeTool(
  'insertContent',
  {
    position: 150,
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Inserted' }] }],
  },
  editor,
);
```

#### deleteContent (NEW!)

Delete content from the document.

**Parameters:**

- `query` (optional): Text to search and delete
- `from` (optional): Start position
- `to` (optional): End position
- `deleteAll` (optional): Delete all occurrences (default: false)

```typescript
// Delete by position
await executeTool(
  'deleteContent',
  {
    from: 100,
    to: 200,
  },
  editor,
);

// Delete by query (first occurrence)
await executeTool(
  'deleteContent',
  {
    query: 'DRAFT',
  },
  editor,
);

// Delete all occurrences
await executeTool(
  'deleteContent',
  {
    query: 'TODO',
    deleteAll: true,
  },
  editor,
);
```

#### replaceContent

Replace content by query or position.

**Parameters:**

- `query` (optional): Text to search and replace
- `from` (optional): Start position
- `to` (optional): End position
- `content`: Array of paragraph nodes
- `replaceAll` (optional): Replace all occurrences (default: false)

```typescript
await executeTool(
  'replaceContent',
  {
    query: 'old text',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'new text' }],
      },
    ],
  },
  editor,
);
```

### Meta Operations

#### getContentSchema

Get the JSON schema for document content format.

```typescript
const result = await executeTool('getContentSchema', {}, editor);
console.log(result.data.schema);
```

## Document Context Helper

Get token-efficient document context for LLM prompts with optional dynamic schema:

```typescript
import { getDocumentContext } from '@superdoc-dev/ai/ai-builder';

// Basic: returns full doc for small docs, selection for large docs
const context = await getDocumentContext(editor, { maxTokens: 4000 });
console.log(context.strategy); // 'full' | 'selection'
console.log(context.content); // Document content (JSON)

// With dynamic schema (recommended for better AI understanding)
const contextWithSchema = await getDocumentContext(editor, {
  maxTokens: 4000,
  includeSchema: true, // Gets schema from editor.getSchemaSummaryJSON()
});

console.log(contextWithSchema.schema);
// {
//   version: "0.34.5",
//   nodes: [{ name: "paragraph", attrs: {...}, content: "...", ... }],
//   marks: [{ name: "bold", attrs: {...}, ... }],
//   topNode: "doc"
// }
```

### Why Use Dynamic Schema?

The dynamic schema from `editor.getSchemaSummaryJSON()` provides:

- ✅ **All available nodes** (paragraphs, headings, tables, images, etc.)
- ✅ **All available marks** (bold, italic, colors, highlights, etc.)
- ✅ **Complete attribute definitions** for each node/mark
- ✅ **Reflects loaded extensions** (custom nodes, marks, attributes)
- ✅ **Better AI understanding** of document capabilities

The hardcoded `CONTENT_SCHEMA` is used as fallback for basic paragraph/text operations.

## Content Schema

The content schema defines the structure for document content:

```typescript
import { CONTENT_SCHEMA } from '@superdoc-dev/ai/ai-builder';

// Use in your system prompt
const systemPrompt = `
You are a document editor.

Content must follow this schema:
${JSON.stringify(CONTENT_SCHEMA, null, 2)}
`;
```

## Complete Example: Custom AI Chat

```typescript
import { openaiTools, executeTool, getDocumentContext } from '@superdoc-dev/ai/ai-builder';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const tools = openaiTools();

async function chat(message: string, editor: Editor) {
  // Get document context
  const context = getDocumentContext(editor, { maxTokens: 4000 });

  // Call OpenAI with tools
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a document editor. Current document:\n${JSON.stringify(context.content)}`,
      },
      { role: 'user', content: message },
    ],
    tools,
  });

  // Execute any tool calls
  const toolCalls = response.choices[0]?.message?.tool_calls || [];
  for (const toolCall of toolCalls) {
    const args = JSON.parse(toolCall.function.arguments);
    const result = await executeTool(toolCall.function.name, args, editor);

    if (!result.success) {
      console.error(`Tool ${toolCall.function.name} failed:`, result.error);
    }
  }

  // Return AI's text response
  return response.choices[0]?.message?.content || '';
}

// Use it
const reply = await chat('Add a conclusion paragraph', editor);
console.log('AI:', reply);
```

## Comparison: ai-builder vs ai-actions

| Feature        | ai-builder (Low-Level)           | ai-actions (High-Level)     |
| -------------- | -------------------------------- | --------------------------- |
| **Control**    | Full control over LLM            | Pre-built operations        |
| **AI Calls**   | You control (1 call)             | Tools make calls (2+ calls) |
| **Cost**       | Lower                            | Higher                      |
| **Complexity** | More code                        | Less code                   |
| **Use Case**   | Custom workflows                 | End-user features           |
| **Tools**      | 8 primitives                     | 9 AI-powered actions        |
| **Providers**  | All (Anthropic, OpenAI, generic) | All (via provider system)   |

### When to Use ai-builder

- ✅ Building custom AI agents
- ✅ Need full control over LLM interaction
- ✅ Cost-sensitive applications
- ✅ Complex multi-step workflows
- ✅ Custom streaming orchestration
- ✅ Want predictable, stateless operations

### When to Use ai-actions

- ✅ End-user AI features
- ✅ Quick development
- ✅ Standard AI operations
- ✅ Auto-planning workflows
- ✅ Simplicity over control

## API Reference

### Functions

#### `executeTool(name, params, editor)`

Execute a tool with given parameters.

**Returns:** `Promise<ToolResult>`

- `success`: boolean
- `data`: Tool-specific result data
- `error`: Error message if failed
- `docChanged`: Whether document was modified
- `message`: Optional message to send back to AI

#### `anthropicTools(options?)`

Get Anthropic-formatted tool definitions.

**Returns:** `AnthropicTool[]`

#### `openaiTools(options?)`

Get OpenAI-formatted tool definitions.

**Returns:** `OpenAITool[]`

#### `genericTools(options?)`

Get provider-agnostic tool definitions.

**Returns:** `GenericToolSchema[]`

#### `getDocumentContext(editor, options?)`

Get token-efficient document context.

**Options:**

- `maxTokens`: Maximum tokens (default: 4000)

**Returns:** `DocumentContextResult`

- `content`: Document content
- `type`: 'full' | 'selection'
- `tokenCount`: Estimated tokens

## License

AGPL-3.0 - see [LICENSE](../../../../LICENSE) for details.
