import {parseProperties} from "./importerHelpers.js";

/**
 * @type {import("docxImporter").NodeHandler}
 */
const handleRunNode = (nodes, docx, nodeListHandler, insideTrackChange = false) => {
    if(nodes.length === 0 || nodes[0].name !== 'w:r') {
        return [];
    }
    const node = nodes[0];
    let processedRun = nodeListHandler.handler(node.elements, docx, insideTrackChange)?.filter(n => n) || [];
    const hasRunProperties = node.elements.some(el => el.name === 'w:rPr');
    if (hasRunProperties) {
        const { marks = [], attributes = {} } = parseProperties(node, docx, nodeListHandler, insideTrackChange);
        if (node.marks) marks.push(...node.marks);
        processedRun = processedRun.map(n => ({ ...n, marks, attributes }));
    }
    return processedRun;
}

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const runNodeHandlerEntity = {
    handlerName: 'runNodeHandler',
    handler: handleRunNode
};