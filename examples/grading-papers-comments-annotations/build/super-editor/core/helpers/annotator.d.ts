export function getFieldAttrs(field: any, value: any, input: any): any;
export function processTables({ state, tr, annotationValues }: {
    editor: any;
    annotationValues: any[];
}): any;
export function getAllHeaderFooterEditors(editor: Editor): any[];
export function annotateDocument({ annotationValues, hiddenFieldIds, removeEmptyFields, schema, tr, editor, }: {
    annotationValues?: any[];
    hiddenFieldIds?: any[];
    removeEmptyFields?: boolean;
    schema: any;
    tr: any;
    editor: any;
}): any;
export namespace AnnotatorHelpers {
    export { getFieldAttrs };
    export { processTables };
    export { annotateDocument };
    export { annotateHeadersAndFooters };
    export { getAllHeaderFooterEditors };
    export { updateHeaderFooterFieldAnnotations };
    export { deleteHeaderFooterFieldAnnotations };
    export { resetHeaderFooterFieldAnnotations };
}
/**
 * Annotate headers and footers in the document
 *
 * @param {Object} param0
 * @param {Object} param0.editor The editor instance
 * @param {Array} param0.annotationValues The annotation values to apply
 * @param {Array} param0.hiddenFieldIds List of field IDs to hide
 * @returns {void}
 */
declare function annotateHeadersAndFooters({ editor, annotationValues, hiddenFieldIds, removeEmptyFields, }: {
    editor: any;
    annotationValues: any[];
    hiddenFieldIds: any[];
}): void;
declare function updateHeaderFooterFieldAnnotations({ editor, fieldIdOrArray, attrs }: {
    editor: any;
    fieldIdOrArray: any;
    attrs?: {};
}): void;
declare function deleteHeaderFooterFieldAnnotations({ editor, fieldIdOrArray }: {
    editor: any;
    fieldIdOrArray: any;
}): void;
declare function resetHeaderFooterFieldAnnotations({ editor }: {
    editor: any;
}): void;
export {};
//# sourceMappingURL=annotator.d.ts.map