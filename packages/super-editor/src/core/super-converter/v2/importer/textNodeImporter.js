import {
  generateUniqueId,
  extractFillableParts,
  getElementName,
  parseProperties,
  getProcessedNodex
} from './importerHelpers.js';

/**
 * @type {import("docxImporter").NodeHandler}
 */
export const handleTextNode = (params) => {
  const { nodes, insideTrackChange } = params;
  if (nodes.length === 0 || !(nodes[0].name === 'w:t' || (insideTrackChange && nodes[0].name === 'w:delText'))) {
    return { nodes: [], consumed: 0 };
  }
  const node = nodes[0];
  const { type } = node;

  // Parse properties
  const { attributes, elements, marks = [] } = parseProperties(node);

  // Text nodes have no children. Only text, and there should only be one child
  let text;
  if (elements.length === 1) text = elements[0].text;
  // Word sometimes will have an empty text node with a space attribute, in that case it should be a space
  else if (!elements.length && 'attributes' in node && node.attributes['xml:space'] === 'preserve') {
    text = ' ';
  }

  // Ignore others - can catch other special cases here if necessary
  else return { nodes: [], consumed: 0 };
  let resultNodes;
  if (!params.editor.options.annotations) {
    resultNodes = [{
      type: getElementName(node),
      text: text,
      attrs: {type, attributes: attributes || {}},
      marks,
    }];
  } else {
    const parts = extractFillableParts(text);
    resultNodes = getProcessedNodex(node, marks, type, parts, attributes);
  }
  return {
    nodes: resultNodes,
    consumed: 1,
  };
};

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const textNodeHandlerEntity = {
  handlerName: 'textNodeHandler',
  handler: handleTextNode,
};
