/**
 * Parse comments.xml into SuperDoc-ready comments
 * These will be available in converter.comments
 *
 * @param {Object} param0
 * @param {ParsedDocx} param0.docx The parsed docx object
 * @param {NodeListHandler} param0.nodeListHandler The node list handler
 * @param {SuperConverter} param0.converter The super converter instance
 * @param {Editor} param0.editor The editor instance
 * @returns {Array} The parsed comments
 */
export function importCommentData({ docx, editor, converter }: {
    docx: ParsedDocx;
    nodeListHandler: NodeListHandler;
    converter: SuperConverter;
    editor: Editor;
}): any[];
//# sourceMappingURL=documentCommentsImporter.d.ts.map