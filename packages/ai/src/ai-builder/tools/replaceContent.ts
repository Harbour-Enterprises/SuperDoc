import type { Editor } from '../../types';
import type { SuperDocTool, ToolResult } from '../types';

/**
 * Params for replaceContent tool
 */
export interface ReplaceContentParams {
    /** Start position (character offset) */
    from: number;
    /** End position (character offset) */
    to: number;
    /** Array of content nodes to replace with (ProseMirror JSON format) */
    content: any[];
}

/**
 * Tool for replacing content in a specific range of the document.
 * Removes content from 'from' to 'to' positions and inserts new content.
 */
export const replaceContent: SuperDocTool = {
    name: 'replaceContent',
    description: 'Replace content in a specific range of the document. Specify from and to positions (character offsets) and provide an array of paragraph blocks to replace with.',
    category: 'write',

    async execute(editor: Editor, params: ReplaceContentParams): Promise<ToolResult> {
        try {
            const { from, to, content } = params;

            if (typeof from !== 'number' || typeof to !== 'number') {
                return {
                    success: false,
                    error: 'From and to must be numbers',
                    docChanged: false
                };
            }

            if (from < 0 || to < from) {
                return {
                    success: false,
                    error: 'Invalid range: from must be >= 0 and to must be >= from',
                    docChanged: false
                };
            }

            if (!content || !Array.isArray(content)) {
                return {
                    success: false,
                    error: 'Content must be an array of nodes',
                    docChanged: false
                };
            }

            const { state } = editor;
            if (!state) {
                return {
                    success: false,
                    error: 'Editor state not available',
                    docChanged: false
                };
            }

            // Clamp positions to valid document range
            const docSize = state.doc.content.size;
            const validFrom = Math.max(0, Math.min(from, docSize));
            const validTo = Math.max(0, Math.min(to, docSize));

            // For full document replacement, use setContent
            if (validFrom === 0 && validTo === docSize) {
                const success = editor.commands.setContent({ type: 'doc', content });

                return {
                    success,
                    data: { replacedRange: { from: validFrom, to: validTo } },
                    docChanged: success,
                    message: success ? 'Replaced entire document' : 'Failed to replace document'
                };
            }

            // For partial replacement, use insertContentAt
            const success = editor.commands.insertContentAt(
                { from: validFrom, to: validTo },
                { type: 'doc', content }
            );

            if (!success) {
                return {
                    success: false,
                    error: 'Failed to replace content',
                    docChanged: false
                };
            }

            return {
                success: true,
                data: { replacedRange: { from: validFrom, to: validTo } },
                docChanged: true,
                message: `Replaced content from position ${validFrom} to ${validTo}`
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                docChanged: false
            };
        }
    }
};
