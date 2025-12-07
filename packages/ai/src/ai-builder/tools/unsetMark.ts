import type { Editor } from '../../types';
import type { SuperDocTool, ToolResult } from '../types';

/**
 * Params for unsetMark tool
 */
export interface UnsetMarkParams {
    from: number;
    to: number;
    markType: 'bold' | 'italic' | 'underline' | 'strike' | 'highlight' | 'textColor' | 'link' | 'code' | 'all';
}

/**
 * Tool for removing formatting marks from text in a specific range.
 * Use 'all' to remove all formatting from the specified range.
 *
 * @example
 * // Remove bold formatting from a range
 * await executeTool('unsetMark', {
 *   from: 100,
 *   to: 110,
 *   markType: 'bold'
 * }, editor);
 *
 * // Remove all formatting from a range
 * await executeTool('unsetMark', {
 *   from: 100,
 *   to: 110,
 *   markType: 'all'
 * }, editor);
 */
export const unsetMark: SuperDocTool = {
    name: 'unsetMark',
    description:
        'Remove formatting mark from text in a specific range. Specify markType (bold, italic, underline, strike, highlight, textColor, link, code, or all) to remove specific formatting or all formatting.',
    category: 'write',

    async execute(editor: Editor, params: UnsetMarkParams): Promise<ToolResult> {
        try {
            const { from, to, markType } = params;

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

            if (!markType) {
                return {
                    success: false,
                    error: 'markType is required',
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
            const validFrom = Math.max(1, Math.min(from, docSize - 1));
            const validTo = Math.max(1, Math.min(to, docSize - 1));

            if (validFrom >= validTo) {
                return {
                    success: false,
                    error: 'Invalid range: from must be less than to',
                    docChanged: false,
                };
            }

            // Set text selection to the range
            editor.commands.setTextSelection({ from: validFrom, to: validTo });

            // Remove the appropriate mark based on type
            let success = false;

            if (markType === 'all') {
                // Remove all marks
                success = editor.commands.unsetAllMarks();
            } else {
                switch (markType) {
                    case 'bold':
                        success = editor.commands.unsetBold();
                        break;

                    case 'italic':
                        success = editor.commands.unsetItalic();
                        break;

                    case 'underline':
                        success = editor.commands.unsetUnderline();
                        break;

                    case 'strike':
                        success = editor.commands.unsetStrike();
                        break;

                    case 'highlight':
                        success = editor.commands.unsetHighlight();
                        break;

                    case 'textColor':
                        success = editor.commands.unsetColor();
                        break;

                    case 'link':
                        success = editor.commands.unsetLink();
                        break;

                    case 'code':
                        success = editor.commands.unsetCode();
                        break;

                    default:
                        return {
                            success: false,
                            error: `Unknown mark type: ${markType}`,
                            docChanged: false,
                        };
                }
            }

            if (!success) {
                return {
                    success: false,
                    error: `Failed to remove ${markType} mark`,
                    docChanged: false,
                };
            }

            return {
                success: true,
                data: {
                    range: { from: validFrom, to: validTo },
                    markType: markType,
                },
                docChanged: true,
                message: `Removed ${markType} mark from position ${validFrom} to ${validTo}`,
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