import type { ToolDefinitionsOptions } from '../types';
import { genericTools, type GenericToolSchema } from './generic';

/**
 * Anthropic-specific tool format
 */
export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

/**
 * Convert generic tool schema to Anthropic format
 */
function convertToAnthropicTool(tool: GenericToolSchema): AnthropicTool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  };
}

/**
 * Generate Anthropic-compatible tool definitions for SuperDoc AI.
 *
 * Returns an array of tool objects compatible with Anthropic's Messages API.
 *
 * @param extensions - Array of SuperDoc extensions (unused for now, reserved for future)
 * @param options - Tool definition options
 * @returns Array of Anthropic tool definitions
 *
 * @example
 * ```typescript
 * import { anthropicTools } from '@superdoc-dev/ai/ai-builder';
 * import Anthropic from '@anthropic-ai/sdk';
 *
 * const tools = anthropicTools();
 *
 * const anthropic = new Anthropic({ apiKey: '...' });
 * const response = await anthropic.messages.create({
 *   model: 'claude-sonnet-4-5',
 *   tools,
 *   messages: [...]
 * });
 * ```
 */
export function anthropicTools(extensions: unknown[] = [], options?: ToolDefinitionsOptions): AnthropicTool[] {
  const tools = genericTools(options);
  return tools.map(convertToAnthropicTool);
}

/**
 * Alias for anthropicTools for consistency
 */
export const toolDefinitions = anthropicTools;
