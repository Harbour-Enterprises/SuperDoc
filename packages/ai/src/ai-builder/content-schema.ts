/**
 * Hardcoded content schema for SuperDoc AI
 *
 * JSON Schema that describes SuperDoc's document structure for LLMs.
 *
 * Structure:
 * - Document = array of paragraphs
 * - Paragraph = contains text nodes with optional marks (bold, italic, etc.)
 * - Supports lists via numberingProperties attribute
 * - Supports headings via styleId attribute
 */

/**
 * The content schema for SuperDoc documents
 *
 * This is a hardcoded schema. Future versions may generate this dynamically.
 */
export const CONTENT_SCHEMA = {
  type: 'array',
  description: 'Array of paragraph nodes that make up the document content',
  items: {
    additionalProperties: false,
    type: 'object',
    required: ['type', 'content'],
    properties: {
      type: {
        type: 'string',
        const: 'paragraph',
        description:
          'Paragraph node. For headings, use styleId attribute (e.g., "Heading1"). For lists, use numberingProperties.',
      },
      content: {
        type: 'array',
        description: 'Array of text nodes and line breaks',
        items: {
          oneOf: [
            {
              type: 'object',
              required: ['type', 'text'],
              properties: {
                type: {
                  type: 'string',
                  const: 'text',
                  description: 'Text content node',
                },
                text: {
                  type: 'string',
                  description: 'The actual text content',
                },
                marks: {
                  type: 'array',
                  description: 'Optional formatting marks (bold, italic, etc.)',
                  items: {
                    type: 'object',
                    required: ['type'],
                    properties: {
                      type: {
                        type: 'string',
                        enum: ['bold', 'italic', 'underline', 'strike', 'link', 'highlight', 'textStyle'],
                        description: 'Type of formatting mark',
                      },
                      attrs: {
                        type: 'object',
                        description: 'Mark attributes (e.g., href for links, color for highlights)',
                      },
                    },
                  },
                },
              },
            },
            {
              type: 'object',
              required: ['type'],
              properties: {
                type: {
                  type: 'string',
                  const: 'hardBreak',
                  description: 'Line break (Shift+Enter)',
                },
              },
            },
          ],
        },
      },
      attrs: {
        type: 'object',
        description: 'Paragraph attributes for styling and structure',
        properties: {
          styleId: {
            type: 'string',
            description: 'Word style ID for headings (e.g., "Heading1", "Heading2", etc.) or other styles',
          },
          textAlign: {
            type: 'string',
            enum: ['left', 'center', 'right', 'justify'],
            description: 'Text alignment',
          },
          lineHeight: {
            oneOf: [{ type: 'string' }, { type: 'number' }],
            description: 'Line height (e.g., "1.5" or 1.5)',
          },
          textIndent: {
            oneOf: [{ type: 'string' }, { type: 'number' }],
            description: 'First-line indentation',
          },
          numberingProperties: {
            type: 'object',
            description: 'List properties. Use numId=1 for bullet lists, numId=2 for numbered lists',
            required: ['numId', 'ilvl'],
            properties: {
              numId: {
                type: 'number',
                description: 'Numbering definition ID: 1 for bullets, 2 for numbered lists',
              },
              ilvl: {
                type: 'number',
                description: 'Indentation level (0-8, where 0 is top level)',
              },
            },
          },
        },
      },
    },
  },
} as const;
