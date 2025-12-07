import type { Editor } from '../../types';
import type { SuperDocTool, ToolResult } from '../types';

/**
 * Params for deleteContent tool
 */
export interface DeleteContentParams {
  query?: string;
  from?: number;
  to?: number;
  deleteAll?: boolean;
}

/**
 * Tool for deleting content from the document.
 * Can delete by query (search and delete) or by exact position range.
 *
 * @example
 * // Delete by position
 * await executeTool('deleteContent', { from: 100, to: 200 }, editor);
 *
 * // Delete by query (first occurrence)
 * await executeTool('deleteContent', { query: 'DRAFT' }, editor);
 *
 * // Delete all occurrences
 * await executeTool('deleteContent', { query: 'TODO', deleteAll: true }, editor);
 */
export const deleteContent: SuperDocTool = {
  name: 'deleteContent',
  description:
    'Delete content from the document. Use query to search and delete text by name, or use from/to for exact positions. Set deleteAll to true to delete all occurrences.',
  category: 'write',

  async execute(editor: Editor, params: DeleteContentParams): Promise<ToolResult> {
    try {
      const { query, from, to, deleteAll = false } = params;
      const { state } = editor;

      if (!state) {
        return {
          success: false,
          error: 'Editor state not available',
          docChanged: false,
        };
      }

      if (query) {
        if (!editor.commands?.search) {
          return {
            success: false,
            error: 'Search command not available in editor',
            docChanged: false,
          };
        }

        const matches = editor.commands.search(query);
        if (!matches || !Array.isArray(matches) || matches.length === 0) {
          return {
            success: false,
            error: `No matches found for "${query}"`,
            docChanged: false,
          };
        }

        const matchesToDelete = deleteAll ? [...matches].reverse() : [matches[0]];
        let deletedCount = 0;

        for (const match of matchesToDelete) {
          const success = editor.commands.insertContentAt({ from: match.from, to: match.to }, '');
          if (success) deletedCount++;
        }

        return {
          success: deletedCount > 0,
          data: {
            deletedCount,
            totalMatches: matches.length,
            query,
          },
          docChanged: deletedCount > 0,
          message: `Deleted ${deletedCount} of ${matches.length} occurrence(s) of "${query}"`,
        };
      }

      if (typeof from !== 'number' || typeof to !== 'number') {
        return {
          success: false,
          error: 'Either query or from/to positions must be provided',
          docChanged: false,
        };
      }

      if (from < 0 || to < from) {
        return {
          success: false,
          error: 'Invalid range: from must be >= 0 and to must be >= from',
          docChanged: false,
        };
      }

      // Clamp positions to valid document range
      const docSize = state.doc.content.size;
      const validFrom = Math.max(0, Math.min(from, docSize));
      const validTo = Math.max(0, Math.min(to, docSize));

      if (validFrom === validTo) {
        return {
          success: false,
          error: 'Cannot delete empty range',
          docChanged: false,
        };
      }

      // Delete the range by replacing with empty content
      const success = editor.commands.insertContentAt({ from: validFrom, to: validTo }, '');

      if (!success) {
        return {
          success: false,
          error: 'Failed to delete content',
          docChanged: false,
        };
      }

      return {
        success: true,
        data: {
          deletedRange: { from: validFrom, to: validTo },
          deletedLength: validTo - validFrom,
        },
        docChanged: true,
        message: `Deleted content from position ${validFrom} to ${validTo}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete content',
        docChanged: false,
      };
    }
  },
};

