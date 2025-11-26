import type { Editor } from '../../types';
import type { SuperDocTool, ToolResult } from '../types';
import { CONTENT_SCHEMA } from '../content-schema';

/**
 * Tool for getting the content schema.
 * Call this before insertContent or replaceContent to understand the expected format.
 *
 * @example
 * // First get the schema
 * const schema = await executeTool('getContentSchema', {}, editor);
 * // Then use the format to create content
 * await executeTool('insertContent', {
 *   position: 'selection',
 *   content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }]
 * }, editor);
 */
export const getContentSchema: SuperDocTool = {
  name: 'getContentSchema',
  description:
    'Get the JSON schema that describes the expected format for document content. Call this before using insertContent or replaceContent to understand how to structure the content array.',
  category: 'read',

  async execute(_editor: Editor): Promise<ToolResult> {
    return {
      success: true,
      data: {
        schema: CONTENT_SCHEMA,
        summary:
          'Content is an array of paragraph objects. Each paragraph has type="paragraph", optional attrs (styleId for headings, numberingProperties for lists), and content array of text nodes with optional marks (bold, italic, etc.).',
      },
      docChanged: false,
      message: 'Content schema returned. Use this format for insertContent and replaceContent.',
    };
  },
};
