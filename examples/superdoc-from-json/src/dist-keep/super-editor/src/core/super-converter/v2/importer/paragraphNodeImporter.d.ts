/**
 * @param {string} defaultStyleId
 * @param {ParsedDocx} docx
 */
export function getDefaultStyleDefinition(defaultStyleId: string, docx: ParsedDocx): {
    lineSpaceBefore: any;
    lineSpaceAfter: any;
} | {
    attrs: {
        name: any;
        qFormat: boolean;
        keepNext: boolean;
        keepLines: boolean;
        outlineLevel: number;
        pageBreakBefore: boolean;
        pageBreakAfter: boolean;
        basedOn: any;
    };
    styles: {
        spacing: {
            lineSpaceAfter: number;
            lineSpaceBefore: number;
            line: number;
        };
        textAlign: any;
        indent: {
            leftIndent: number;
            rightIndent: number;
            firstLine: number;
        };
    };
};
/**
 * We need to pre-process nodes in a paragraph to combine nodes together where necessary ie: links
 * TODO: Likely will find more w:fldChar to deal with.
 *
 * @param {XmlNode[]} nodes
 * @returns
 */
export function preProcessNodesForFldChar(nodes?: XmlNode[]): any[];
/**
 * Special cases of w:p based on paragraph properties
 *
 * If we detect a list node, we need to get all nodes that are also lists and process them together
 * in order to combine list item nodes into list nodes.
 *
 * @type {import("docxImporter").NodeHandler}
 */
export const handleParagraphNode: any;
export function getParagraphIndent(node: any, docx: any, styleId?: string): {
    left: number;
    right: number;
    firstLine: number;
    hanging: number;
    textIndent: number;
};
export function getParagraphSpacing(node: any, docx: any, styleId?: string, marks?: any[]): {
    line: string | number;
    lineRule: any;
    lineSpaceBefore: number;
    lineSpaceAfter: number;
};
/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const paragraphNodeHandlerEntity: any;
