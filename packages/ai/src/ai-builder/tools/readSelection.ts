import type { Node } from 'prosemirror-model';
import type { Editor } from '../../types';
import type { SuperDocTool, ToolResult } from '../types';

/**
 * Params for readSelection tool
 */
export interface ReadSelectionParams {
  /** Number of paragraphs to include before and after the selection for context */
  withContext?: number;
}

/**
 * Tool for reading the currently selected content in the document.
 * Returns the selection range and the JSON representation of the selected content.
 * Optionally includes surrounding paragraphs for context.
 *
 * @example
 * // Read just the selection
 * const selection = await executeTool('readSelection', {}, editor);
 *
 * // Read selection with 2 paragraphs before/after for context
 * const selection = await executeTool('readSelection', { withContext: 2 }, editor);
 */
export const readSelection: SuperDocTool = {
  name: 'readSelection',
  description:
    'Read the currently selected content in the document. Returns the selection range (from/to positions) and the JSON representation. Use withContext to include surrounding paragraphs.',
  category: 'read',

  async execute(editor: Editor, params?: ReadSelectionParams): Promise<ToolResult> {
    try {
      const { state } = editor;
      if (!state) {
        return {
          success: false,
          error: 'Editor state not available',
          docChanged: false,
        };
      }

      const { from, to } = state.selection;
      const selectedContent = state.doc.cut(from, to);
      const doc = state.doc;

      const result: {
        from: number;
        to: number;
        content: any;
        before?: any;
        after?: any;
      } = {
        from,
        to,
        content: selectedContent.toJSON(),
      };

      // If withContext is specified, get surrounding paragraphs
      const contextCount = params?.withContext;
      if (contextCount && contextCount > 0) {
        // Get paragraphs before selection
        const beforeParagraphs: { position: number; content: ReturnType<Node['toJSON']> }[] = [];
        doc.nodesBetween(0, from, (node: Node, pos: number) => {
          if (node.type.name === 'paragraph') {
            beforeParagraphs.push({
              position: pos,
              content: node.toJSON(),
            });
          }
          return true;
        });
        // Take the last N paragraphs before selection
        result.before = beforeParagraphs.slice(-contextCount).map((p) => p.content);

        // Get paragraphs after selection
        const afterParagraphs: ReturnType<Node['toJSON']>[] = [];
        doc.nodesBetween(to, doc.content.size, (node: Node, _pos: number) => {
          if (node.type.name === 'paragraph' && afterParagraphs.length < contextCount) {
            afterParagraphs.push(node.toJSON());
          }
          return afterParagraphs.length < contextCount;
        });
        result.after = afterParagraphs;
      }

      return {
        success: true,
        data: result,
        docChanged: false,
        message: `Selection from position ${from} to ${to}${contextCount ? ` with ${contextCount} paragraphs context` : ''}`,
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
