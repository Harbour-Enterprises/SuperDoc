import type { Editor } from '../../types';
import type { SuperDocTool, ToolResult } from '../types';
import { CONTENT_SCHEMA } from '../content-schema';

/**
 * Tool for getting the content schema.
 * Returns the dynamic schema from the editor if available (getSchemaSummaryJSON),
 * or falls back to the hardcoded schema.
 *
 * @example
 * // First get the schema
 * const result = await executeTool('getContentSchema', {}, editor);
 * console.log(result.data.schema); // Full schema with all nodes, marks, and attributes
 * 
 * // Then use the format to create content
 * await executeTool('insertContent', {
 *   position: 'selection',
 *   content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }]
 * }, editor);
 */
export const getContentSchema: SuperDocTool = {
  name: 'getContentSchema',
  description:
    'Get the JSON schema that describes the document format including all available nodes, marks, and attributes. Call this before using insertContent or replaceContent to understand the full document structure and capabilities.',
  category: 'read',

  async execute(editor: Editor): Promise<ToolResult> {
    try {
      if (editor && typeof editor.getSchemaSummaryJSON === 'function') {
        const dynamicSchema = await editor.getSchemaSummaryJSON();
        
        return {
          success: true,
          data: {
            schema: dynamicSchema,
            nodes: dynamicSchema.nodes,
            marks: dynamicSchema.marks,
            version: dynamicSchema.version,
            topNode: dynamicSchema.topNode,
            summary: 'Dynamic schema generated from editor. Use nodes and marks arrays to understand available document elements and their attributes.',
          },
          docChanged: false,
          message: 'Dynamic schema returned with all available nodes, marks, and attributes.',
        };
      }
    } catch (error) {
      console.warn('Failed to get dynamic schema, using fallback:', error);
    }

    return {
      success: true,
      data: {
        schema: CONTENT_SCHEMA,
        summary:
          'Content is an array of paragraph objects. Each paragraph has type="paragraph", optional attrs (styleId for headings, numberingProperties for lists), and content array of text nodes with optional marks (bold, italic, etc.).',
      },
      docChanged: false,
      message: 'Static content schema returned (basic format). Use this format for insertContent and replaceContent.',
    };
  },
};
