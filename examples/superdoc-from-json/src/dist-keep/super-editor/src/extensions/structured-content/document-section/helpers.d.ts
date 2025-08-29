export function getAllSections(editor: Editor): any[];
export function exportSectionsToHTML(editor: Editor): any[];
export function getHTMLFromNode(node: Node, editor: Editor): string;
export function exportSectionsToJSON(editor: Editor): any[];
export function getLinkedSectionEditor(id: string, options: any, editor: Editor): Editor | null;
export namespace SectionHelpers {
    export { getAllSections };
    export { exportSectionsToHTML };
    export { exportSectionsToJSON };
    export { getLinkedSectionEditor };
}
