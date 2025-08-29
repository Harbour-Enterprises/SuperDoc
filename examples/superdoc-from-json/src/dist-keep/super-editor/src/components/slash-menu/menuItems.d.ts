/**
 * Get menu sections based on context (trigger, selection, node, etc)
 * @param {Object} context - { editor, selectedText, pos, node, event, trigger }
 * @returns {Array<{
 *   id: string,
 *   items: Array<{
 *     id: string,
 *     label: string,
 *     icon?: string,
 *     component?: Component,
 *     action?: (editor: Editor) => void,
 *     allowedTriggers: Array<'slash'|'click'>,
 *     requiresSelection?: boolean,
 *     requiresClipboard?: boolean
 *     requiresTableParent?: boolean
 *     requiredSectionParent?: boolean,
 *     requiresModule?: string
 *   }>
 * }>} Array of menu sections
 */
export function getItems(context: any): Array<{
    id: string;
    items: Array<{
        id: string;
        label: string;
        icon?: string;
        component?: Component;
        action?: (editor: Editor) => void;
        allowedTriggers: Array<"slash" | "click">;
        requiresSelection?: boolean;
        requiresClipboard?: boolean;
        requiresTableParent?: boolean;
        requiredSectionParent?: boolean;
        requiresModule?: string;
    }>;
}>;
