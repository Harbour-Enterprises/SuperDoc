import type { AnthropicTool, ToolDefinitionsOptions } from '../types';

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
 * import { anthropicTools } from '@superdoc-dev/ai/ai-builder/providers';
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
  const { enabledTools } = options || {};

  // Define all available tools
  const allTools: AnthropicTool[] = [
    {
      name: 'readSelection',
      description:
        'Read the currently selected content in the document. Returns the selection range (from/to positions) and the JSON representation. Use withContext to include surrounding paragraphs.',
      input_schema: {
        type: 'object',
        properties: {
          withContext: {
            type: 'integer',
            description: 'Number of paragraphs to include before and after the selection for context (optional)',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
    {
      name: 'readContent',
      description:
        'Read document content at a specific position range (from/to character offsets). Use after searchContent to read actual content at found positions.',
      input_schema: {
        type: 'object',
        properties: {
          from: {
            type: 'integer',
            description: 'Start position (character offset)',
          },
          to: {
            type: 'integer',
            description: 'End position (character offset)',
          },
        },
        required: ['from', 'to'],
        additionalProperties: false,
      },
    },
    {
      name: 'searchContent',
      description:
        'Search for text or patterns in the document. Returns matches with their positions (from/to character offsets). Use with readContent to see context or replaceContent to modify.',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The text or pattern to search for',
          },
          caseSensitive: {
            type: 'boolean',
            description: 'Whether the search should be case-sensitive (default: false)',
          },
          regex: {
            type: 'boolean',
            description: 'Whether to treat query as a regular expression (default: false)',
          },
          findAll: {
            type: 'boolean',
            description: 'Whether to return all matches or just the first one (default: true)',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
    {
      name: 'getContentSchema',
      description:
        'Get the JSON schema for document content format. Call this before insertContent or replaceContent to understand the expected structure for the content array.',
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
    {
      name: 'insertContent',
      description:
        'Insert new content into the document. Call getContentSchema first to understand the content format. Position can be "selection" (at cursor), "documentStart", or "documentEnd".',
      input_schema: {
        type: 'object',
        properties: {
          position: {
            type: 'string',
            enum: ['selection', 'documentStart', 'documentEnd'],
            description: 'Where to insert the content',
          },
          content: {
            type: 'array',
            description: 'Array of paragraph nodes. Call getContentSchema for the full format specification.',
          },
        },
        required: ['position', 'content'],
        additionalProperties: false,
      },
    },
    {
      name: 'replaceContent',
      description:
        'Replace content in the document. Use query to search and replace text by name, or use from/to for exact positions.',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Text to search for and replace. Use this instead of from/to positions.',
          },
          from: {
            type: 'integer',
            description: 'Start position (character offset). Only needed if query is not provided.',
          },
          to: {
            type: 'integer',
            description: 'End position (character offset). Only needed if query is not provided.',
          },
          content: {
            type: 'array',
            description: 'Array of paragraph nodes to replace with.',
          },
          replaceAll: {
            type: 'boolean',
            description: 'Whether to replace all occurrences when using query (default: false)',
          },
        },
        required: ['content'],
        additionalProperties: false,
      },
    },
    {
      name: 'getDocumentOutline',
      description:
        'Get the document outline (headings and their positions). Use this to understand document structure before reading or editing specific sections.',
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
    {
      name: 'readSection',
      description:
        'Read a specific section of the document by heading name or position range. Use heading parameter to find by name, or from/to for exact positions.',
      input_schema: {
        type: 'object',
        properties: {
          heading: {
            type: 'string',
            description:
              'Heading text to find and read (case-insensitive partial match). The section includes content until the next heading of same or higher level.',
          },
          from: {
            type: 'integer',
            description: 'Start position (character offset). Alternative to heading parameter.',
          },
          to: {
            type: 'integer',
            description: 'End position (character offset). Alternative to heading parameter.',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  ];

  // Filter tools if enabledTools is specified
  if (enabledTools && enabledTools.length > 0) {
    return allTools.filter((tool) => enabledTools.includes(tool.name));
  }

  return allTools;
}

/**
 * Alias for anthropicTools for consistency
 */
export const toolDefinitions = anthropicTools;
