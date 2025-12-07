import type { Editor } from '../../types';
import type { SuperDocTool, ToolResult } from '../types';

/**
 * Params for readRange tool
 */
interface ReadRangeParams {
    from: number;
    to: number;
    includeFormatting?: boolean;
    chunkSize?: number;
}

export default ReadRangeParams

/**
 * Tool for reading content from a specific range of the document.
 * Useful for analyzing or processing specific sections.
 *
 * @example
 * // Read content from positions 100 to 500
 * const result = await executeTool('readRange', {
 *   from: 100,
 *   to: 500,
 *   includeFormatting: true
 * }, editor);
 * // Returns: { content: [...], text: "...", range: { from: 100, to: 500 } }
 */
export const readRange: SuperDocTool = {
    name: 'readRange',
    description:
        'Read content from a specific range of the document. Returns both the structured content (JSON) and plain text. Specify from and to positions (character offsets).',
    category: 'read',

    async execute(editor: Editor, params: ReadRangeParams): Promise<ToolResult> {
        try {
            const { from, to, includeFormatting = true, chunkSize = 32000 } = params;

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

            // Check if range is too large
            const rangeSize = validTo - validFrom;
            if (rangeSize > chunkSize) {
                return {
                    success: false,
                    error: `Range size (${rangeSize}) exceeds maximum chunk size (${chunkSize}). Consider reading in smaller chunks.`,
                    docChanged: false,
                    data: {
                        suggestedChunks: Math.ceil(rangeSize / chunkSize),
                        chunkSize: chunkSize,
                    },
                };
            }

            // Extract the slice of the document
            const slice = state.doc.slice(validFrom, validTo);

            // Get plain text
            const text = slice.content.textBetween(0, slice.content.size, '\n');

            // Get structured content if formatting is included
            let content: any[] | undefined;
            if (includeFormatting) {
                content = [];
                slice.content.forEach((node: any) => {
                    content!.push(node.toJSON());
                });
            }

            return {
                success: true,
                data: {
                    range: { from: validFrom, to: validTo },
                    text: text,
                    content: content,
                    size: rangeSize,
                },
                docChanged: false,
                message: `Read ${rangeSize} characters from position ${validFrom} to ${validTo}`,
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