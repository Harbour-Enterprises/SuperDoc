/**
 * SuperDoc AI Builder - Low-level primitives for building custom AI workflows
 *
 * @module ai-builder
 *
 * AI Builder provides the foundational components for creating AI-powered
 * document editing experiences. It offers:
 *
 * - **Tools**: Core document operations (insert, replace)
 * - **Executor**: Primitive for running tool calls (executeTool)
 * - **Provider**: Anthropic tool schemas
 * - **Schema Generator**: Generate schemas from SuperDoc extensions
 *
 * @example
 * ```typescript
 * import { executeTool, anthropicTools } from '@superdoc-dev/ai/ai-builder';
 * import Anthropic from '@anthropic-ai/sdk';
 *
 * // Get tool definitions
 * const tools = anthropicTools(editor.extensionManager.extensions);
 *
 * // Use with Anthropic SDK
 * const anthropic = new Anthropic({ apiKey: '...' });
 * const response = await anthropic.beta.messages.create({
 *   model: 'claude-sonnet-4-5',
 *   tools,
 *   messages: [...]
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
