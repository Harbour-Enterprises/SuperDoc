import { parseAnnotationMarks } from './annotationImporter.js';

/**
 * @type {import("docxImporter").NodeHandler}
 */
export const handleSdtNode = (params) => {
  const { nodes, nodeListHandler } = params;
  if (nodes.length === 0 || nodes[0].name !== 'w:sdt') {
    return { nodes: [], consumed: 0 };
  }

  const node = nodes[0];
  const sdtPr = node.elements.find((el) => el.name === 'w:sdtPr');
  const sdtContent = node.elements.find((el) => el.name === 'w:sdtContent');
  const { marks } = parseAnnotationMarks(sdtContent);

  const translatedContent = nodeListHandler.handler({ ...params, nodes: sdtContent?.elements });

  let result = {
    type: 'structuredContent',
    content: translatedContent,
    marks,
    attrs: {
      sdtPr,
    },
  };

  return {
    nodes: [result],
    consumed: 1,
  };
};

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const sdtNodeHandlerEntity = {
  handlerName: 'sdtNodeHandler',
  handler: handleSdtNode,
};
