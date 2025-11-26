/**
 * SuperDoc AI Builder - Low-level primitives for building custom AI workflows
 *
 * @module ai-builder
 *
 * AI Builder provides the foundational components for creating AI-powered
 * document editing experiences. It offers:
 *
 * - **Tools**: Core document operations (read, search, insert, replace)
 * - **Executor**: Primitive for running tool calls (executeTool)
 * - **Provider**: Anthropic tool schemas
 * - **Helper**: Token-efficient document context (getDocumentContext)
 *
 * @example
 * ```typescript
 * import { executeTool, anthropicTools, getDocumentContext } from '@superdoc-dev/ai/ai-builder';
 * import Anthropic from '@anthropic-ai/sdk';
 *
 * // Get tool definitions
 * const tools = anthropicTools();
 *
 * // Get document context (full doc for small, selection for large)
 * const context = getDocumentContext(editor, { maxTokens: 5000 });
 *
 * // Use with Anthropic SDK
 * const anthropic = new Anthropic({ apiKey: '...' });
 * const response = await anthropic.messages.create({
 *   model: 'claude-sonnet-4-5',
 *   system: `You are a document editor.\n\nDocument:\n${JSON.stringify(context.content)}`,
 *   tools,
 *   messages: [{ role: 'user', content: userMessage }]
 * });
 *
 * // Execute tool calls
 * for (const toolUse of response.content.filter(c => c.type === 'tool_use')) {
 *   await executeTool(toolUse.name, toolUse.input, editor);
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
export { anthropicTools } from './providers/anthropic';
export * from './providers/index';

// Content schema
export { CONTENT_SCHEMA } from './content-schema';

// Helpers
export { getDocumentContext } from './helpers/getDocumentContext';
export type { DocumentContextResult, DocumentContextOptions } from './helpers/getDocumentContext';
