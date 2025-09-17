export function generateNewListDefinition({ numId, listType, level, start, text, fmt, editor }: {
    numId: number;
    listType: any;
    editor: Editor;
}): any;
export function changeNumIdSameAbstract(numId: number, level: number, listType: string, editor: Editor): number;
export function getBasicNumIdTag(numId: any, abstractId: any): {
    type: string;
    name: string;
    attributes: {
        'w:numId': string;
    };
    elements: {
        name: string;
        attributes: {
            'w:val': string;
        };
    }[];
};
export function getNewListId(editor: Editor, grouping?: string): number;
export function getListDefinitionDetails({ numId, level, listType, editor, tries }: {
    numId: number;
    level: number;
    listType?: string;
    editor: any;
    tries?: number;
}): any;
export function removeListDefinitions(listId: string, editor: Editor): void;
export function createListItemNodeJSON({ level, lvlText, numId, numFmt, start, listLevel, contentNode }: {
    level: number;
    lvlText: string;
    numId: number;
    numFmt: string;
    start: number;
    listLevel: any[];
    contentNode: any;
}): any;
export function createSchemaOrderedListNode({ level, numId, listType, editor, listLevel, contentNode }: {
    level: number;
    numId: number;
    editor: Editor;
    contentNode: any;
}): any;
export function createNewList({ listType, tr, editor }: {
    listType: string | any;
    editor: Editor;
    node: any;
    content: any;
}): Function;
export function getCurrentListItem(state: any): Node | null;
export function getParentOrderedList(state: any): Node | null;
export function setSelectionInsideNewList(tr: any, basePos: number): void;
export function replaceListWithNode({ tr, from, to, newNode }: {
    tr: any;
    from: number;
    to: number;
    newNode: Node;
}): void;
export function convertListItemToParagraph({ state, tr, currentNode, replaceFrom, replaceTo }: {
    state: any;
    tr: any;
    currentNode: Node;
    replaceFrom: number;
    replaceTo: number;
}): boolean;
export function insertNewList(tr: any, replaceFrom: number, replaceTo: number, listNode: Node, marks?: any[]): Function;
export function getListItemStyleDefinitions({ styleId, node, numId, level, editor, tries }: {
    styleId: string;
    numId: number;
    level: number;
    editor: Editor;
}): any;
export function addInlineTextMarks(currentNode: any, filteredMarks: any[]): any[];
export namespace ListHelpers {
    export { getCurrentListItem };
    export { getParentOrderedList };
    export { setSelectionInsideNewList };
    export { replaceListWithNode };
    export { convertListItemToParagraph };
    export { insertNewList };
    export { getListDefinitionDetails };
    export { generateNewListDefinition };
    export { getBasicNumIdTag };
    export { getNewListId };
    export { removeListDefinitions };
    export { getListItemStyleDefinitions };
    export { createNewList };
    export { createSchemaOrderedListNode };
    export { createListItemNodeJSON };
    export { addInlineTextMarks };
    export { changeNumIdSameAbstract };
    export { baseOrderedListDef };
    export { baseBulletList };
}
//# sourceMappingURL=list-numbering-helpers.d.ts.map