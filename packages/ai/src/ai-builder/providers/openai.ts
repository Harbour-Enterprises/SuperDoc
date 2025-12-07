import type { ToolDefinitionsOptions } from '../types';
import { genericTools, type GenericToolSchema } from './generic';

/**
 * OpenAI-specific tool format (for function calling)
 */
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
      additionalProperties?: boolean;
    };
  };
}

/**
 * Convert generic tool schema to OpenAI format
 */
function convertToOpenAITool(tool: GenericToolSchema): OpenAITool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

/**
 * Generate OpenAI-compatible tool definitions for SuperDoc AI.
 *
 * Returns an array of tool objects compatible with OpenAI's Chat Completions API.
 *
 * @param options - Tool definition options
 * @returns Array of OpenAI tool definitions
 *
 * @example
 * ```typescript
 * import { openaiTools, executeTool, getDocumentContext } from '@superdoc-dev/ai/ai-builder';
 * import OpenAI from 'openai';
 *
 * const tools = openaiTools();
 * const context = getDocumentContext(editor, { maxTokens: 4000 });
 *
 * const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
 * const response = await openai.chat.completions.create({
 *   model: 'gpt-4',
 *   messages: [
 *     { role: 'system', content: `Document:\n${JSON.stringify(context.content)}` },
 *     { role: 'user', content: 'Add a heading before the selected paragraph.' }
 *   ],
 *   tools
 * });
 *
 * // Execute tool calls
 * for (const toolCall of response.choices[0]?.message?.tool_calls || []) {
 *   const args = JSON.parse(toolCall.function.arguments);
 *   await executeTool(toolCall.function.name, args, editor);
 * }
 * ```
 */
export function openaiTools(options?: ToolDefinitionsOptions): OpenAITool[] {
  const tools = genericTools(options);
  return tools.map(convertToOpenAITool);
}

/**
 * Alias for openaiTools for consistency
 */
export const toolDefinitions = openaiTools;

