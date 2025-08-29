/**
 * Add default styles if missing. Default styles are:
 *
 * Normal, Title, Subtitle, Heading1, Heading2, Heading3
 *
 * Does not mutate the original docx object
 * @param {Object} styles The parsed docx styles [word/styles.xml]
 * @returns {Object | null} The updated styles object with default styles
 */
export function addDefaultStylesIfMissing(styles: any): any | null;
export function createDocumentJson(docx: ParsedDocx, converter: SuperConverter, editor: Editor): {
    pmDoc: PmNodeJson;
    savedTagsToRestore: XmlNode;
    pageStyles: any;
} | null;
export function defaultNodeListHandler(): {
    handler: ({ nodes: elements, docx, insideTrackChange, converter, editor, filename, parentStyleId, lists, }: {
        nodes: any;
        docx: any;
        insideTrackChange: any;
        converter: any;
        editor: any;
        filename: any;
        parentStyleId: any;
        lists: any;
    }) => any[];
    handlerEntities: any[];
};
export type XmlNode = import(any);
export type PmNodeJson = {
    type: string;
    content: any;
    attrs: {};
};
export type PmMarkJson = {
    type: string;
    attrs: {};
};
export type NodeListHandlerFn = (nodes: XmlNode[], docx: ParsedDocx, insideTrackCahange: boolean) => PmNodeJson[];
export type NodeListHandler = {
    handler: NodeListHandlerFn;
    handlerEntities: NodeHandlerEntry[];
};
export type NodeHandler = (nodes: XmlNode[], docx: ParsedDocx, nodeListHandler: NodeListHandler, insideTrackCahange: boolean) => {
    nodes: PmNodeJson[];
    consumed: number;
};
export type NodeHandlerEntry = {
    handlerName: string;
    handler: NodeHandler;
};
