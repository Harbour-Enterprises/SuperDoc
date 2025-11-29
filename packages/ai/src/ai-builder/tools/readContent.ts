import type { Editor } from '../../types';
import type { SuperDocTool, ToolResult } from '../types';

/**
 * Params for readContent tool
 */
export interface ReadContentParams {
  /** Start position (character offset) */
  from: number;
  /** End position (character offset) */
  to: number;
}

/**
 * Tool for reading content at a specific position range.
 * Use this after searchContent to read the actual content around a found position.
 *
 * @example
 * // First find the position
 * const searchResult = await executeTool('searchContent', { query: 'Introduction' }, editor);
 * // Then read the content around it
 * const content = await executeTool('readContent', {
 *   from: searchResult.data.matches[0].from,
 *   to: searchResult.data.matches[0].to + 500 // read 500 chars after
 * }, editor);
 */
export const readContent: SuperDocTool = {
  name: 'readContent',
  description:
    'Read document content at a specific position range (from/to character offsets). Use after searchContent to read actual content at found positions.',
  category: 'read',

  async execute(editor: Editor, params: ReadContentParams): Promise<ToolResult> {
    try {
      const { from, to } = params;

      if (typeof from !== 'number' || typeof to !== 'number') {
        return {
          success: false,
          error: 'Both "from" and "to" parameters must be numbers',
          docChanged: false,
        };
      }

      if (from < 0 || to < from) {
        return {
          success: false,
          error: 'Invalid range: "from" must be >= 0 and "to" must be >= "from"',
          docChanged: false,
        };
      }

      const { state } = editor;
      if (!state) {
        return {
          success: false,
          error: 'Editor state not available',
          docChanged: false,
        };
      }

      // Clamp positions to document bounds
      const docSize = state.doc.content.size;
      const clampedFrom = Math.min(from, docSize);
      const clampedTo = Math.min(to, docSize);

      const content = state.doc.cut(clampedFrom, clampedTo);

      return {
        success: true,
        data: {
          from: clampedFrom,
          to: clampedTo,
          content: content.toJSON(),
        },
        docChanged: false,
        message: `Read content from position ${clampedFrom} to ${clampedTo}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read content',
        docChanged: false,
      };
    }
  },
};
