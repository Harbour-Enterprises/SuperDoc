import { translator as wDrawingNodeTranslator } from '@converter/v3/handlers/w/drawing';

/**
 * @type {import("docxImporter").NodeHandler}
 */
export const handleDrawingNode = (params) => {
  const { nodes } = params;

  const validNodes = ['w:drawing', 'w:p'];
  if (nodes.length === 0 || !validNodes.includes(nodes[0].name)) {
    return { nodes: [], consumed: 0 };
  }

  const mainNode = nodes[0];
  let node;

  if (mainNode.name === 'w:drawing') node = mainNode;
  else node = mainNode.elements.find((el) => el.name === 'w:drawing');

  if (!node) return { nodes: [], consumed: 0 };

  const schemaNode = wDrawingNodeTranslator.encode(params);
  const newNodes = schemaNode ? [schemaNode] : [];
  return { nodes: newNodes, consumed: 1 };
};

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const drawingNodeHandlerEntity = {
  handlerName: 'drawingNodeHandler',
  handler: handleDrawingNode,
};
