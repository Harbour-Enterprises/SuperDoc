import type { AnthropicTool, ToolDefinitionsOptions } from '../types';
import { CONTENT_SCHEMA } from '../content-schema';

/**
 * Generate Anthropic-compatible tool definitions from SuperDoc extensions.
 *
 * Returns an array of tool objects compatible with Anthropic's Messages API
 * and structured outputs (strict mode).
 *
 * @param extensions - Array of SuperDoc extensions
 * @param options - Tool definition options
 * @returns Array of Anthropic tool definitions
 *
 * @example
 * ```typescript
 * import { anthropicTools } from '@superdoc-dev/ai/ai-builder/providers';
 * import Anthropic from '@anthropic-ai/sdk';
 *
 * const tools = anthropicTools(editor.extensionManager.extensions, {
 *   excludedNodes: ['table'],
 *   excludedMarks: ['strike', 'underline'],
 *   strict: true
 * });
 *
 * const anthropic = new Anthropic({ apiKey: '...' });
 * const response = await anthropic.beta.messages.create({
 *   model: 'claude-sonnet-4-5',
 *   betas: ['structured-outputs-2025-11-13'],
 *   tools,
 *   messages: [...]
 * });
 * ```
 */
export function anthropicTools(
    extensions: any[] = [],
    options?: ToolDefinitionsOptions
): AnthropicTool[] {
    const {
        enabledTools
    } = options || {};

    // Define all available tools
    const allTools: AnthropicTool[] = [
        {
            name: 'searchDocument',
            description: 'Search for text or patterns in the document. Returns matches with their positions (from/to character offsets). Use this before replaceContent to find exact positions.',
            input_schema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'The text or pattern to search for'
                    },
                    caseSensitive: {
                        type: 'boolean',
                        description: 'Whether the search should be case-sensitive (default: false)'
                    },
                    regex: {
                        type: 'boolean',
                        description: 'Whether to treat query as a regular expression (default: false)'
                    },
                    findAll: {
                        type: 'boolean',
                        description: 'Whether to return all matches or just the first one (default: true)'
                    }
                },
                required: ['query'],
                additionalProperties: false
            }
        },
        {
            name: 'insertContent',
            description: 'Insert new content into the document. Position can be "selection" (at cursor), "documentStart", or "documentEnd". Content should be an array of paragraph blocks.',
            input_schema: {
                type: 'object',
                properties: {
                    position: {
                        type: 'string',
                        enum: ['selection', 'documentStart', 'documentEnd'],
                        description: 'Where to insert the content'
                    },
                    content: CONTENT_SCHEMA
                },
                required: ['position', 'content'],
                additionalProperties: false
            }
        },
        {
            name: 'replaceContent',
            description: 'Replace content in a specific range of the document. Specify from and to positions (character offsets) and provide an array of paragraph blocks to replace with.',
            input_schema: {
                type: 'object',
                properties: {
                    from: {
                        type: 'integer',
                        description: 'Start position (character offset)'
                    },
                    to: {
                        type: 'integer',
                        description: 'End position (character offset)'
                    },
                    content: CONTENT_SCHEMA
                },
                required: ['from', 'to', 'content'],
                additionalProperties: false
            }
        }
    ];

    // Filter tools if enabledTools is specified
    if (enabledTools && enabledTools.length > 0) {
        return allTools.filter(tool => enabledTools.includes(tool.name));
    }

    return allTools;
}

/**
 * Alias for anthropicTools for consistency
 */
export const toolDefinitions = anthropicTools;
