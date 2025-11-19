import type { Editor } from '../../types';
import type { SuperDocTool, ToolResult } from '../types';

/**
 * Tool for reading the currently selected content in the document.
 * Returns the selection range and the JSON representation of the selected content.
 */
export const readSelection: SuperDocTool = {
    name: 'readSelection',
    description: 'Read the currently selected content in the document. Returns the selection range (from/to positions) and the JSON representation of the selected content.',
    category: 'read',

    async execute(editor: Editor): Promise<ToolResult> {
        try {
            const { state } = editor;
            if (!state) {
                return {
                    success: false,
                    error: 'Editor state not available',
                    docChanged: false
                };
            }

            const { from, to } = state.selection;
            const selectedContent = state.doc.cut(from, to);

            return {
                success: true,
                data: {
                    from,
                    to,
                    content: selectedContent.toJSON()
                },
                docChanged: false,
                message: `Selection from position ${from} to ${to}`
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
