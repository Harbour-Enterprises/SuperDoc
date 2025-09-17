export function exportSectionsToHTML(editor: Editor): any[];
export function exportSectionsToJSON(editor: Editor): any[];
export function getLinkedSectionEditor(id: string, options: any, editor: Editor): Editor | null;
export namespace SectionHelpers {
    export { getAllSections };
    export { exportSectionsToHTML };
    export { exportSectionsToJSON };
    export { getLinkedSectionEditor };
}
/**
 * Get all sections in the editor document.
 * This function traverses the document and collects all nodes of the specified section type.
 * @param {Editor} editor - The editor instance to search within.
 * @returns {Array} An array of objects containing the node and its position in the document
 */
declare function getAllSections(editor: Editor): any[];
export {};
//# sourceMappingURL=documentSectionHelpers.d.ts.map