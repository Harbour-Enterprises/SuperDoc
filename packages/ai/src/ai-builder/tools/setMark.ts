import type { Editor } from '../../types';
import type { SuperDocTool, ToolResult } from '../types';

/**
 * Params for setMark tool
 */
export interface SetMarkParams {
    from: number;
    to: number;
    mark: {
        type: 'bold' | 'italic' | 'underline' | 'strike' | 'highlight' | 'textColor' | 'link' | 'code';
        attrs?: {
            color?: string;
            backgroundColor?: string;
            href?: string;
            target?: string;
        };
    };
}

/**
 * Tool for applying formatting marks to text in a specific range.
 * Works with searchDocument to first find text, then apply formatting.
 *
 * @example
 * // First, search for the text
 * const searchResult = await executeTool('searchDocument', {
 *   query: 'iqidis',
 *   findAll: true
 * }, editor);
 *
 * // Then apply highlighting to each match
 * for (const match of searchResult.data.matches) {
 *   await executeTool('setMark', {
 *     from: match.from,
 *     to: match.to,
 *     mark: {
 *       type: 'highlight',
 *       attrs: { backgroundColor: 'yellow' }
 *     }
 *   }, editor);
 * }
 */
export const setMark: SuperDocTool = {
    name: 'setMark',
    description:
        'Apply formatting mark to text in a specific range. Use this to make text bold, italic, underlined, highlighted, colored, or to add links. Requires from and to positions (use searchDocument to find positions first).',
    category: 'write',

    async execute(editor: Editor, params: SetMarkParams): Promise<ToolResult> {
        try {
            const { from, to, mark } = params;

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

            if (!mark || !mark.type) {
                return {
                    success: false,
                    error: 'Mark type is required',
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

            // Apply the appropriate mark based on type
            let success = false;
            const markType = mark.type;

            switch (markType) {
                case 'bold':
                    success = editor.commands.setBold();
                    break;

                case 'italic':
                    success = editor.commands.setItalic();
                    break;

                case 'underline':
                    success = editor.commands.setUnderline();
                    break;

                case 'strike':
                    success = editor.commands.setStrike();
                    break;

                case 'highlight':
                    if (mark.attrs?.backgroundColor) {
                        success = editor.commands.setHighlight({
                            color: mark.attrs.backgroundColor,
                        });
                    } else {
                        success = editor.commands.setHighlight();
                    }
                    break;

                case 'textColor':
                    if (mark.attrs?.color) {
                        success = editor.commands.setColor(mark.attrs.color);
                    } else {
                        return {
                            success: false,
                            error: 'Color is required for textColor mark',
                            docChanged: false,
                        };
                    }
                    break;

                case 'link':
                    if (mark.attrs?.href) {
                        success = editor.commands.setLink({
                            href: mark.attrs.href,
                            target: mark.attrs.target || '_blank',
                        });
                    } else {
                        return {
                            success: false,
                            error: 'href is required for link mark',
                            docChanged: false,
                        };
                    }
                    break;

                case 'code':
                    success = editor.commands.setCode();
                    break;

                default:
                    return {
                        success: false,
                        error: `Unknown mark type: ${markType}`,
                        docChanged: false,
                    };
            }

            if (!success) {
                return {
                    success: false,
                    error: `Failed to apply ${markType} mark`,
                    docChanged: false,
                };
            }

            return {
                success: true,
                data: {
                    range: { from: validFrom, to: validTo },
                    mark: mark,
                },
                docChanged: true,
                message: `Applied ${markType} mark from position ${validFrom} to ${validTo}`,
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