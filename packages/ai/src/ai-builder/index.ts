/**
 * SuperDoc AI Builder - Low-level primitives for building custom AI workflows
 *
 * @module ai-builder
 *
 * AI Builder provides the foundational components for creating AI-powered
 * document editing experiences with full control over LLM interaction.
 *
 * ## Features
 * - **8 Primitive Tools**: Core document operations (read, search, insert, replace)
 * - **Multi-Provider**: Anthropic, OpenAI, and generic tool schemas
 * - **Executor**: Simple tool execution (executeTool)
 * - **Context Helper**: Token-efficient document context (getDocumentContext)
 * - **Content Schema**: Full document format specification
 *
 * ## Supported Providers
 * - ✅ Anthropic Claude (anthropicTools)
 * - ✅ OpenAI GPT-4 (openaiTools)
 * - ✅ Generic/Custom (genericTools)
 *
 * @example Anthropic
 * ```typescript
 * import { executeTool, anthropicTools, getDocumentContext } from '@superdoc-dev/ai/ai-builder';
 * import Anthropic from '@anthropic-ai/sdk';
 *
 * const tools = anthropicTools();
 * const context = await getDocumentContext(editor, { 
 *   maxTokens: 5000,
 *   includeSchema: true  // Get dynamic schema from editor
 * });
 *
 * const anthropic = new Anthropic({ apiKey: '...' });
 * const response = await anthropic.messages.create({
 *   model: 'claude-sonnet-4-5',
 *   system: `Document:\n${JSON.stringify(context.content)}\n\nSchema:\n${JSON.stringify(context.schema)}`,
 *   tools,
 *   messages: [{ role: 'user', content: userMessage }]
 * });
 *
 * for (const block of response.content) {
 *   if (block.type === 'tool_use') {
 *     await executeTool(block.name, block.input, editor);
 *   }
 * }
 * ```
 *
 * @example OpenAI
 * ```typescript
 * import { executeTool, openaiTools, getDocumentContext } from '@superdoc-dev/ai/ai-builder';
 * import OpenAI from 'openai';
 *
 * const tools = openaiTools();
 * const context = await getDocumentContext(editor, { 
 *   maxTokens: 4000,
 *   includeSchema: true  // Get dynamic schema with all nodes and marks
 * });
 *
 * const openai = new OpenAI({ apiKey: '...' });
 * const response = await openai.chat.completions.create({
 *   model: 'gpt-4',
 *   messages: [
 *     { 
 *       role: 'system', 
 *       content: `Document:\n${JSON.stringify(context.content)}\n\nAvailable nodes and marks:\n${JSON.stringify(context.schema)}` 
 *     },
 *     { role: 'user', content: userMessage }
 *   ],
 *   tools
 * });
 *
 * for (const toolCall of response.choices[0]?.message?.tool_calls || []) {
 *   const args = JSON.parse(toolCall.function.arguments);
 *   await executeTool(toolCall.function.name, args, editor);
 * }
 * ```
 */

// Core types
export type * from './types';

// Tools
export * from './tools/index';

// Executor
export { executeTool } from './executor';

// Providers
export { 
  anthropicTools,
  openaiTools,
  genericTools,
  type GenericToolSchema 
} from './providers';
export * from './providers/index';

// Content schema
export { CONTENT_SCHEMA } from './content-schema';

// Helpers
export { getDocumentContext } from './helpers/getDocumentContext';
export type { DocumentContextResult, DocumentContextOptions } from './helpers/getDocumentContext';
