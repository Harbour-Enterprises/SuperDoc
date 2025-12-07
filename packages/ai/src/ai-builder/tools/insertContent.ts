import type { Editor } from '../../types';
import type { SuperDocTool, ToolResult } from '../types';
import { enrichParagraphNodes } from '../helpers/enrichContent';

/**
 * Params for insertContent tool
 */
export interface InsertContentParams {
  /** 
   * Where to insert content:
   * - 'selection' | 'beforeSelection' | 'replaceSelection': At/before/replace current selection
   * - 'afterSelection': After current selection
   * - 'documentStart': At start of document
   * - 'documentEnd': At end of document
   * - number: At specific character position
   */
  position: 'selection' | 'beforeSelection' | 'afterSelection' | 'replaceSelection' | 'documentStart' | 'documentEnd' | number;
  /** Array of content nodes to insert (ProseMirror JSON format) */
  content: any[];
}

/**
 * Tool for inserting content at specified positions in the document.
 * Supports multiple positioning modes:
 * - Relative to selection (before, at, after, replace)
 * - Absolute positions (start, end, specific offset)
 * - Numeric positions for precise placement
 */
export const insertContent: SuperDocTool = {
  name: 'insertContent',
  description:
    'Insert new content into the document. Position can be "selection" (at cursor), "beforeSelection", "afterSelection", "replaceSelection", "documentStart", "documentEnd", or a specific number (character offset). Content should be an array of paragraph blocks in ProseMirror JSON format.',
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
      let isReplacement = false;
      let replaceEnd: number | undefined;

      // Handle different position types
      if (typeof position === 'number') {
        // Numeric position: clamp to document bounds
        insertPos = Math.max(0, Math.min(position, state.doc.content.size));
      } else {
        switch (position) {
          case 'selection':
          case 'beforeSelection':
            insertPos = state.selection.from;
            break;

          case 'afterSelection':
            insertPos = state.selection.to;
            break;

          case 'replaceSelection':
            insertPos = state.selection.from;
            replaceEnd = state.selection.to;
            isReplacement = true;
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
              error: `Invalid position: ${position}. Use "selection", "beforeSelection", "afterSelection", "replaceSelection", "documentStart", "documentEnd", or a number.`,
              docChanged: false,
            };
        }
      }

      // Execute insertion or replacement
      let success: boolean;

      if (isReplacement && replaceEnd !== undefined) {
        // Replace selection
        success = editor.commands.insertContentAt(
          { from: insertPos, to: replaceEnd },
          enrichedContent.length === 1 ? enrichedContent[0] : enrichedContent,
        );
      } else {
        // Insert at position
        success = editor.commands.insertContentAt(
          insertPos,
          enrichedContent.length === 1 ? enrichedContent[0] : enrichedContent,
        );
      }

      if (!success) {
        return {
          success: false,
          error: 'Failed to insert content',
          docChanged: false,
        };
      }

      const positionDesc = typeof position === 'number' ? `position ${position}` : position;

      return {
        success: true,
        data: {
          insertedAt: insertPos,
          replaced: isReplacement ? { from: insertPos, to: replaceEnd } : undefined,
        },
        docChanged: true,
        message: `Inserted ${enrichedContent.length} node(s) at ${positionDesc}${isReplacement ? ' (replaced selection)' : ''}`,
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

