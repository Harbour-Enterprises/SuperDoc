import type { Node } from 'prosemirror-model';
import type { Editor } from '../../types';
import type { SuperDocTool, ToolResult } from '../types';

/**
 * Heading info returned in document outline
 */
export interface HeadingInfo {
  /** The heading text */
  text: string;
  /** Heading level (1-6) */
  level: number;
  /** Start position in document */
  position: number;
}

/**
 * Tool for getting document structure/outline.
 * Returns headings with their positions so LLM can navigate large documents.
 *
 * @example
 * const outline = await executeTool('getDocumentOutline', {}, editor);
 * // Returns: { headings: [{ text: "Introduction", level: 1, position: 0 }, ...], totalLength: 5000 }
 */
export const getDocumentOutline: SuperDocTool = {
  name: 'getDocumentOutline',
  description:
    'Get the document outline (headings and their positions). Use this to understand document structure before reading or editing specific sections.',
  category: 'read',

  async execute(editor: Editor): Promise<ToolResult> {
    try {
      const { state } = editor;
      if (!state) {
        return {
          success: false,
          error: 'Editor state not available',
          docChanged: false,
        };
      }

      const headings: HeadingInfo[] = [];
      const doc = state.doc;

      // Walk through document to find headings
      doc.descendants((node: Node, pos: number) => {
        if (node.type.name === 'paragraph') {
          const styleId = node.attrs?.styleId;
          if (styleId && typeof styleId === 'string') {
            // Check for Heading1, Heading2, etc.
            const match = styleId.match(/^Heading(\d)$/i);
            if (match) {
              const level = parseInt(match[1], 10);
              // Extract text content from the paragraph
              let text = '';
              node.content.forEach((child: Node) => {
                if (child.isText) {
                  text += child.text;
                }
              });

              headings.push({
                text: text.trim() || '(untitled)',
                level,
                position: pos,
              });
            }
          }
        }
        return true; // continue traversal
      });

      return {
        success: true,
        data: {
          headings,
          totalLength: doc.content.size,
          headingCount: headings.length,
        },
        docChanged: false,
        message: `Found ${headings.length} headings in document`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get document outline',
        docChanged: false,
      };
    }
  },
};
