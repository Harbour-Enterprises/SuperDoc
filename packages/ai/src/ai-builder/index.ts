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

// Execution
export * from './execution';

// Providers
export { anthropicTools } from './providers/anthropic';
export { openaiTools } from './providers/openai';
export * from './providers/index';

// Schema (exclude getContentSchema to avoid conflict with tool)
export {
    generateContentSchema,
    clearSchemaCache,
    generateLegacyContentSchema,
    type SchemaGeneratorOptions,
} from './schema/schema-generator';

export {
    generateOptimizedSchema,
    calculateSchemaStats,
    compareOptimizations,
    getRecommendedOptimization,
    type OptimizationLevel,
    type SchemaOptimizationOptions,
    type SchemaStats,
} from './schema/schema-optimizer';

export {
    validateContent,
    autoFixContent,
    formatValidationErrors,
    type ValidationResult,
    type ValidationError,
    type ValidationWarning,
} from './schema/schema-validator';

// Utils
export * from './utils';
