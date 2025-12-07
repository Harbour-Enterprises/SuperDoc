import type { Editor } from '../../types';
import type { SuperDocTool, ToolResult } from '../types';

/**
 * Params for deleteContent tool
 */
export interface DeleteContentParams {
    from: number;
    to: number;
}

/**
 * Tool for deleting content in a specific range of the document.
 * Use with searchDocument to find and delete specific text.
 *
 * @example
 * // Delete content from position 100 to 200
 * await executeTool('deleteContent', {
 *   from: 100,
 *   to: 200
 * }, editor);
 *
 * // Find and delete all occurrences of a word
 * const searchResult = await executeTool('searchDocument', {
 *   query: 'obsolete',
 *   findAll: true
 * }, editor);
 *
 * // Delete matches in reverse order to maintain positions
 * for (let i = searchResult.data.matches.length - 1; i >= 0; i--) {
 *   const match = searchResult.data.matches[i];
 *   await executeTool('deleteContent', {
 *     from: match.from,
 *     to: match.to
 *   }, editor);
 * }
 */
export const deleteContent: SuperDocTool = {
    name: 'deleteContent',
    description:
        'Delete content in a specific range of the document. Specify from and to positions (character offsets). When deleting multiple ranges, delete from end to start to maintain correct positions.',
    category: 'write',

    async execute(editor: Editor, params: DeleteContentParams): Promise<ToolResult> {
        try {
            const { from, to } = params;

            if (typeof from !== 'number' || typeof to !== 'number') {
                return {
                    success: false,
                    error: 'From and to must be numbers',
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

            const { state } = editor;
            if (!state) {
                return {
                    success: false,
                    error: 'Editor state not available',
                    docChanged: false,
                };
            }

            // Clamp positions to valid document range
            const docSize = state.doc.content.size;
            const validFrom = Math.max(0, Math.min(from, docSize));
            const validTo = Math.max(0, Math.min(to, docSize));

            if (validFrom >= validTo) {
                return {
                    success: false,
                    error: 'Invalid range: from must be less than to',
                    docChanged: false,
                };
            }

            // Store deleted text for reference
            const deletedSlice = state.doc.slice(validFrom, validTo);
            const deletedText = deletedSlice.content.textBetween(0, deletedSlice.content.size, '\n');

            // Delete the content by selecting and deleting
            const success = editor.commands.deleteRange({ from: validFrom, to: validTo });

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
                    deletedText: deletedText,
                    deletedSize: validTo - validFrom,
                },
                docChanged: true,
                message: `Deleted ${validTo - validFrom} characters from position ${validFrom} to ${validTo}`,
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