import type { Editor } from '../../types';
import type { SuperDocTool, ToolResult } from '../types';

/**
 * Params for updateNode tool
 */
export interface UpdateNodeParams {
    position: number;
    nodeType?: string;
    attrs: {
        level?: number;
        textAlign?: 'left' | 'center' | 'right' | 'justify';
        styleId?: string;
        lineSpacing?: number;
        spacingBefore?: number;
        spacingAfter?: number;
        [key: string]: any;
    };
}

/**
 * Tool for updating node attributes in the document.
 * Use this to change heading levels, alignment, spacing, and other node properties.
 *
 * @example
 * // Change a paragraph to a heading level 2
 * await executeTool('updateNode', {
 *   position: 100,
 *   nodeType: 'heading',
 *   attrs: { level: 2 }
 * }, editor);
 *
 * // Change text alignment to center
 * await executeTool('updateNode', {
 *   position: 100,
 *   attrs: { textAlign: 'center' }
 * }, editor);
 *
 * // Update multiple attributes
 * await executeTool('updateNode', {
 *   position: 100,
 *   attrs: {
 *     textAlign: 'justify',
 *     spacingAfter: 12,
 *     lineSpacing: 1.5
 *   }
 * }, editor);
 */
export const updateNode: SuperDocTool = {
    name: 'updateNode',
    description:
        'Update attributes of a node at a specific position. Use this to change heading levels, text alignment, spacing, or other node properties. Specify position (character offset) and attrs object with properties to update.',
    category: 'write',

    async execute(editor: Editor, params: UpdateNodeParams): Promise<ToolResult> {
        try {
            const { position, nodeType, attrs } = params;

            if (typeof position !== 'number') {
                return {
                    success: false,
                    error: 'Position must be a number',
                    docChanged: false,
                };
            }

            if (!attrs || typeof attrs !== 'object') {
                return {
                    success: false,
                    error: 'attrs object is required',
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

            // Clamp position to valid document range
            const docSize = state.doc.content.size;
            const validPosition = Math.max(0, Math.min(position, docSize));

            // Find the node at this position
            const resolvedPos = state.doc.resolve(validPosition);
            const node = resolvedPos.parent;

            if (!node) {
                return {
                    success: false,
                    error: `No node found at position ${validPosition}`,
                    docChanged: false,
                };
            }

            // If nodeType is specified, verify it matches
            if (nodeType && node.type.name !== nodeType) {
                return {
                    success: false,
                    error: `Node at position ${validPosition} is ${node.type.name}, not ${nodeType}`,
                    docChanged: false,
                    data: {
                        actualNodeType: node.type.name,
                        expectedNodeType: nodeType,
                    },
                };
            }

            // Get the position of the node itself (not the position inside it)
            const nodePos = resolvedPos.before(resolvedPos.depth);

            // Handle special cases for specific node types
            let success = false;

            // For heading nodes with level attribute
            if (node.type.name === 'heading' && attrs.level !== undefined) {
                const level = attrs.level;
                if (level < 1 || level > 6) {
                    return {
                        success: false,
                        error: 'Heading level must be between 1 and 6',
                        docChanged: false,
                    };
                }
                editor.commands.setTextSelection(nodePos);
                success = editor.commands.setHeading({ level });
            }

            // For text alignment
            if (attrs.textAlign !== undefined) {
                editor.commands.setTextSelection(nodePos);
                success = editor.commands.setTextAlign(attrs.textAlign);
            }

            // For other attributes, use updateAttributes command
            if (!success) {
                editor.commands.setTextSelection(nodePos);
                success = editor.commands.updateAttributes(node.type.name, attrs);
            }

            if (!success) {
                return {
                    success: false,
                    error: `Failed to update node attributes`,
                    docChanged: false,
                };
            }

            return {
                success: true,
                data: {
                    position: validPosition,
                    nodeType: node.type.name,
                    updatedAttrs: attrs,
                },
                docChanged: true,
                message: `Updated ${node.type.name} node at position ${validPosition}`,
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