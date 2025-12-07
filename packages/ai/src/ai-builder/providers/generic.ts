import type { ToolDefinitionsOptions } from '../types';

/**
 * Generic tool schema format (provider-agnostic)
 */
export interface GenericToolSchema {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

/**
 * Generate provider-agnostic tool definitions for SuperDoc AI.
 * This is the base format that can be converted to any provider's format.
 *
 * @param options - Tool definition options
 * @returns Array of generic tool definitions
 *
 * @example
 * ```typescript
 * import { genericTools } from '@superdoc-dev/ai/ai-builder';
 * 
 * const tools = genericTools();
 * // Convert to your provider's format as needed
 * ```
 */
export function genericTools(options?: ToolDefinitionsOptions): GenericToolSchema[] {
  const { enabledTools } = options || {};

  const allTools: GenericToolSchema[] = [
    {
      name: 'readSelection',
      description: 
        'Read the currently selected content in the document. Returns the selection range (from/to positions) and the JSON representation. Use withContext to include surrounding paragraphs.',
      parameters: {
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
      parameters: {
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
      parameters: {
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
      parameters: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
    {
      name: 'insertContent',
      description: 
        'Insert new content into the document. Call getContentSchema first to understand the content format. Position can be "selection", "beforeSelection", "afterSelection", "replaceSelection", "documentStart", "documentEnd", or a specific number (character offset).',
      parameters: {
        type: 'object',
        properties: {
          position: {
            oneOf: [
              {
                type: 'string',
                enum: ['selection', 'beforeSelection', 'afterSelection', 'replaceSelection', 'documentStart', 'documentEnd'],
                description: 'Named position: selection, beforeSelection, afterSelection, replaceSelection, documentStart, or documentEnd',
              },
              {
                type: 'number',
                description: 'Specific character offset position in the document',
              },
            ],
            description: 'Where to insert the content',
          },
          content: {
            type: 'array',
            description: 'Array of paragraph nodes. Call getContentSchema for the full format specification.',
            items: {
              type: 'object',
              description: 'A paragraph node in ProseMirror JSON format',
            },
          },
        },
        required: ['position', 'content'],
        additionalProperties: false,
      },
    },
    {
      name: 'deleteContent',
      description: 
        'Delete content from the document. Use query to search and delete text by name, or use from/to for exact positions. Set deleteAll to true to delete all occurrences.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Text to search for and delete. Use this instead of from/to positions.',
          },
          from: {
            type: 'integer',
            description: 'Start position (character offset). Only needed if query is not provided.',
          },
          to: {
            type: 'integer',
            description: 'End position (character offset). Only needed if query is not provided.',
          },
          deleteAll: {
            type: 'boolean',
            description: 'Whether to delete all occurrences when using query (default: false)',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
    {
      name: 'replaceContent',
      description: 
        'Replace content in the document. Use query to search and replace text by name, or use from/to for exact positions.',
      parameters: {
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
            items: {
              type: 'object',
              description: 'A paragraph node in ProseMirror JSON format',
            },
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
      parameters: {
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
      parameters: {
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

