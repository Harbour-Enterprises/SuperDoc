/**
 * @param {Object} params
 * @returns {Array|null}
 */
export function handleDocPartObj(params) {
  const { nodes } = params;

  if (nodes.length === 0 || nodes[0].name !== 'w:sdt') {
    return null;
  }

  const node = nodes[0];
  const sdtPr = node.elements.find((el) => el.name === 'w:sdtPr');
  const docPartObj = sdtPr?.elements.find((el) => el.name === 'w:docPartObj');
  const docPartGallery = docPartObj?.elements.find((el) => el.name === 'w:docPartGallery');
  const docPartGalleryType = docPartGallery?.attributes['w:val'];

  if (!docPartGalleryType || !validGalleryTypeMap[docPartGalleryType]) {
    // TODO: Handle catching unkown gallery types
    return null;
  }

  const content = node?.elements.find((el) => el.name === 'w:sdtContent');
  const handler = validGalleryTypeMap[docPartGalleryType];
  const result = handler({ ...params, nodes: [content] });

  return result;
}

export const tableOfContentsHandler = (params) => {
  const node = params.nodes[0];
  return params.nodeListHandler.handler({ ...params, nodes: node.elements });
};

const validGalleryTypeMap = {
  'Table of Contents': tableOfContentsHandler,
};
