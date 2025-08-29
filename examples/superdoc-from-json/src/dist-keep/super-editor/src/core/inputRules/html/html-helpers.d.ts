/**
 * Flattens ALL lists to ensure each list contains exactly ONE list item.
 * Handles both multi-item lists and nested lists.
 */
export function flattenListsInHtml(html: any, editor: any): any;
/**
 * Creates a single-item list from an <li> element
 */
export function createSingleItemList({ li, tag, rootNumId, level, listLevel, editor, NodeInterface }: {
    li: any;
    tag: any;
    rootNumId: any;
    level: any;
    listLevel: any;
    editor: any;
    NodeInterface: any;
}): any;
/**
 * Converts flatten lists back to normal list structure.
 */
export function unflattenListsInHtml(html: any): string;
