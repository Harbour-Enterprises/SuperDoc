/**
 * @typedef {Object} NodeHandlerParams
 * @property {Array} nodes - The array of nodes to process.
 * @property {Object} docx - The parsed DOCX object.
 * @property {boolean} insideTrackChange - Indicates if the processing is inside a track change.
 * @property {NodeListHandler} nodeListHandler - The node list handler.
 * @property {Object} converter - The converter object.
 * @property {import('../../../../Editor').Editor} editor - The editor object.
 * @property {string} [filename] - The name of the file being processed.
 * @property {string} [parentStyleId] - The ID of the parent style.
 * @property {Object} [lists] - The imported lists object
 * @property {Array} [path] - The path of nodes leading to the current node.
 * @property {Record<string, any>} [extraParams] - The extra params.
 */

/**
 * @typedef {Object} XmlNode
 * @typedef {{type: string, content: *, attrs: [], sdNodeOrKeyName: string, marks: [] }} PmNodeJson
 * @typedef {{type: string, attrs: {}}} PmMarkJson
 *
 * @typedef {Object} ParsedDocx
 *
 * @typedef {{handler: NodeListHandlerFn, handlerEntities: NodeHandlerEntry[]}} NodeListHandler
 * @typedef {(params: NodeHandlerParams) => PmNodeJson[]} NodeListHandlerFn
 *
 * @typedef {(params: NodeHandlerParams) => {nodes: PmNodeJson[], consumed: number}} NodeHandler
 * @typedef {{handlerName: string, handler: NodeHandler}} NodeHandlerEntry
 *
 * @typedef {Object} SuperConverter
 * @typedef {Object} Editor
 */

export {};
