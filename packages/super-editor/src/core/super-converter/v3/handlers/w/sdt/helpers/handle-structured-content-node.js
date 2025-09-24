import { parseAnnotationMarks } from './handle-annotation-node';

/**
 * @param {Object} params
 * @returns {Object|null}
 */
export function handleStructuredContentNode(params) {
  const { nodes, nodeListHandler } = params;

  if (nodes.length === 0 || nodes[0].name !== 'w:sdt') {
    return null;
  }

  const node = nodes[0];
  const sdtPr = node.elements.find((el) => el.name === 'w:sdtPr');
  const sdtContent = node.elements.find((el) => el.name === 'w:sdtContent');

  if (!sdtContent) {
    return null;
  }

  const paragraph = sdtContent.elements?.find((el) => el.name === 'w:p');
  const table = sdtContent.elements?.find((el) => el.name === 'w:tbl');
  const { marks } = parseAnnotationMarks(sdtContent);
  const translatedContent = nodeListHandler.handler({
    ...params,
    nodes: sdtContent.elements,
    path: [...(params.path || []), sdtContent],
  });

  let sdtContentType = 'structuredContent';
  if (paragraph || table) {
    // If a paragraph or potentially another block node is found.
    sdtContentType = 'structuredContentBlock';
  }

  let result = {
    type: sdtContentType,
    content: translatedContent,
    marks,
    attrs: {
      sdtPr,
    },
  };

  return result;
}
