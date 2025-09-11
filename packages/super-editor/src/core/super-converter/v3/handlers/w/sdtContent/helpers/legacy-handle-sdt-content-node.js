import { parseAnnotationMarks } from '@converter/v2/importer/annotationImporter';

/**
 * @param {Object} options
 * @returns {{type: string, content: (*|*[]), attrs: {}}}
 */
export function handleSdtContentNode({ params, node, sdtNode }) {
  const sdtPr = sdtNode.elements.find((el) => el.name === 'w:sdtPr');
  const par = node.elements?.find((el) => el.name === 'w:p');
  const { marks } = parseAnnotationMarks(node);

  const translatedContent = params.nodeListHandler.handler({
    ...params,
    nodes: node.elements,
    path: [...(params.path || []), node],
  });

  let sdtContentType = 'structuredContent';
  if (par) {
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
