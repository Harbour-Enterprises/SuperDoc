import type { Editor } from '../../types';
import type { SuperDocTool, ToolResult } from '../types';
import { enrichParagraphNodes } from '../helpers/enrichContent';

/**
 * Params for insertContent tool
 */
export interface InsertContentParams {
  /** Where to insert: 'selection' (at cursor), 'documentStart', or 'documentEnd' */
  position: 'selection' | 'documentStart' | 'documentEnd';
  /** Array of content nodes to insert (ProseMirror JSON format) */
  content: any[];
}

/**
 * Tool for inserting content at specified positions in the document.
 * Supports inserting at cursor position, document start, or document end.
 */
export const insertContent: SuperDocTool = {
  name: 'insertContent',
  description:
    'Insert new content into the document. Position can be "selection" (at cursor), "documentStart", or "documentEnd". Content should be an array of paragraph blocks in ProseMirror JSON format.',
  category: 'write',

  async execute(editor: Editor, params: InsertContentParams): Promise<ToolResult> {
    try {
      const { position, content } = params;

      if (!content || !Array.isArray(content)) {
        return {
          success: false,
          error: 'Content must be an array of nodes',
          docChanged: false,
        };
      }

      // Automatically add default spacing attributes to paragraph nodes
      const enrichedContent = enrichParagraphNodes(content);

      const { state } = editor;
      if (!state) {
        return {
          success: false,
          error: 'Editor state not available',
          docChanged: false,
        };
      }

      let insertPos: number;
      switch (position) {
        case 'selection':
          insertPos = state.selection.from;
          break;
        case 'documentStart':
          insertPos = 0;
          break;
        case 'documentEnd':
          insertPos = state.doc.content.size;
          break;
        default:
          return {
            success: false,
            error: `Invalid position: ${position}`,
            docChanged: false,
          };
      }

      // Use editor's insertContentAt command
      // For single nodes, pass directly; for multiple, wrap in an array
      let insertSuccess: boolean;

      if (Array.isArray(enrichedContent) && enrichedContent.length === 1) {
        // Single node: pass directly
        insertSuccess = editor.commands.insertContentAt(insertPos, enrichedContent[0]);
      } else {
        // Multiple nodes or array: pass as-is
        insertSuccess = editor.commands.insertContentAt(insertPos, enrichedContent);
      }

      const success = insertSuccess;

      if (!success) {
        return {
          success: false,
          error: 'Failed to insert content',
          docChanged: false,
        };
      }

      return {
        success: true,
        data: { insertedAt: insertPos },
        docChanged: true,
        message: `Inserted ${enrichedContent.length} node(s) at ${position}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        docChanged: false,
      };
    }
  },
};
