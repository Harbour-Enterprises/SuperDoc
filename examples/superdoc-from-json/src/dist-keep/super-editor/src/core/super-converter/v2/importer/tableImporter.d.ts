/**
 *
 * @param {XmlNode} node
 * @param {ParsedDocx} docx
 * @param {NodeListHandler} nodeListHandler
 * @param {boolean} insideTrackChange
 * @returns {{type: string, content: *, attrs: {borders: *, tableWidth: *, tableWidthType: *}}}
 */
export function handleTableNode(node: XmlNode, params: any): {
    type: string;
    content: any;
    attrs: {
        borders: any;
        tableWidth: any;
        tableWidthType: any;
    };
};
/**
 *
 * @param node
 * @param {ParsedDocx} docx
 * @param {NodeListHandler} nodeListHandler
 * @param {boolean} insideTrackChange
 * @returns {{type: string, content: (*|*[]), attrs: {}}}
 */
export function handleTableCellNode(node: any, row: any, table: any, rowBorders: any, columnWidth: any, styleTag: any, params: any, columnIndex: any): {
    type: string;
    content: (any | any[]);
    attrs: {};
};
/**
 * Process a table row node
 * @param node
 * @param {undefined | null | {insideH?: *, insideV?: *}} rowBorders
 * @param {ParsedDocx} docx
 * @param {NodeListHandler} nodeListHandler
 * @param {boolean} insideTrackChange
 * @returns {*}
 */
export function handleTableRowNode(node: any, table: any, rowBorders: undefined | null | {
    insideH?: any;
    insideV?: any;
}, styleTag: any, params: any): any;
/**
 * @type {import("docxImporter").NodeHandler}
 */
export const handleAllTableNodes: any;
/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const tableNodeHandlerEntity: any;
