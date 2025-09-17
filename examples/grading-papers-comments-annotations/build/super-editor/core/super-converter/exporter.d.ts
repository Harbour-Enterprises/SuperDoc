/**
 * @typedef {Object} ExportParams
 * @property {Object} node JSON node to translate (from PM schema)
 * @property {Object} bodyNode The stored body node to restore, if available
 * @property {Object[]} relationships The relationships to add to the document
 */
/**
 * @typedef {Object} SchemaNode
 * @property {string} type The name of this node from the prose mirror schema
 * @property {Array<SchemaNode>} content The child nodes
 * @property {Object} attrs The node attributes
 * /

/**
 * @typedef {Object} XmlReadyNode
 * @property {string} name The XML tag name
 * @property {Array<XmlReadyNode>} elements The child nodes
 * @property {Object} attributes The node attributes
 */
/**
 * @typedef {Object.<string, *>} SchemaAttributes
 * Key value pairs representing the node attributes from prose mirror
 */
/**
 * @typedef {Object.<string, *>} XmlAttributes
 * Key value pairs representing the node attributes to export to XML format
 */
/**
 * @typedef {Object} MarkType
 * @property {string} type The mark type
 * @property {Object} attrs Any attributes for this mark
 */
/**
 * Main export function. It expects the prose mirror data as JSON (ie: a doc node)
 *
 * @param {ExportParams} params - The parameters object, containing a node and possibly a body node
 * @returns {XmlReadyNode} The complete document node in XML-ready format
 */
export function exportSchemaToJson(params: ExportParams): XmlReadyNode;
/**
 * Translate a paragraph node
 *
 * @param {ExportParams} node A prose mirror paragraph node
 * @returns {XmlReadyNode} JSON of the XML-ready paragraph node
 */
export function translateParagraphNode(params: any): XmlReadyNode;
export function translateHardBreak(params: any): {
    name: string;
    elements: {
        name: string;
        type: string;
        attributes: {
            'w:type': string;
        };
    }[];
};
export class DocxExporter {
    constructor(converter: any);
    converter: any;
    schemaToXml(data: any, debug?: boolean): string;
    #private;
}
export type ExportParams = {
    /**
     * JSON node to translate (from PM schema)
     */
    node: any;
    /**
     * The stored body node to restore, if available
     */
    bodyNode: any;
    /**
     * The relationships to add to the document
     */
    relationships: any[];
};
export type SchemaNode = {
    /**
     * The name of this node from the prose mirror schema
     */
    type: string;
    /**
     * The child nodes
     */
    content: Array<SchemaNode>;
    /**
     * The node attributes
     * /
     *
     * /**
     */
    attrs: any;
};
export type XmlReadyNode = {
    /**
     * The XML tag name
     */
    name: string;
    /**
     * The child nodes
     */
    elements: Array<XmlReadyNode>;
    /**
     * The node attributes
     */
    attributes: any;
};
/**
 * Key value pairs representing the node attributes from prose mirror
 */
export type SchemaAttributes = {
    [x: string]: any;
};
/**
 * Key value pairs representing the node attributes to export to XML format
 */
export type XmlAttributes = {
    [x: string]: any;
};
export type MarkType = {
    /**
     * The mark type
     */
    type: string;
    /**
     * Any attributes for this mark
     */
    attrs: any;
};
//# sourceMappingURL=exporter.d.ts.map