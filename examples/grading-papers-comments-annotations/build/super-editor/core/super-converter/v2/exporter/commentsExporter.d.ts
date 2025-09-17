/**
 * Generate the end node for a comment
 *
 * @param {Object} params The export params
 * @returns {Object} The translated w:commentRangeEnd node for the comment
 */
export function translateCommentNode(params: any, type: any): any;
export function prepareCommentParaIds(comment: any): any;
export function getCommentDefinition(comment: any, commentId: string, allComments: any, editor: any): any;
export function getInitials(name: string): string | null;
export function toIsoNoFractional(unixMillis: number): string;
export function updateCommentsXml(commentDefs: any[], commentsXml: any): any;
export function updateCommentsExtendedXml(comments: any, commentsExtendedXml: any): any;
export function updateCommentsIdsAndExtensible(comments: any, commentsIds: any, extensible: any): any;
export function updateDocumentRels(): any;
export function generateConvertedXmlWithCommentFiles(convertedXml: any): any;
export function getCommentsFilesConverted(converter: any, convertedXml: any): any;
export function removeCommentsFilesFromConvertedXml(convertedXml: any): any;
export function generateRelationship(target: string): any;
export function prepareCommentsXmlFilesForExport({ convertedXml, defs, commentsWithParaIds, exportType, converter, }: any): {
    documentXml: any;
    relationships: any[];
};
//# sourceMappingURL=commentsExporter.d.ts.map