export function handleDocPartObj(params) {
  const { nodes } = params;

  if (nodes.length === 0 || nodes[0].name !== 'w:sdt') {
    return undefined;
  }

  const node = nodes[0];
  const sdtPr = node.elements.find((el) => el.name === 'w:sdtPr');
  const docPartObj = sdtPr?.elements.find((el) => el.name === 'w:docPartObj');
  const docPartGallery = docPartObj?.elements.find((el) => el.name === 'w:docPartGallery');
  const docPartGalleryType = docPartGallery?.attributes['w:val'];

  if (!docPartGalleryType) {
    return undefined;
  }

  if (!validGalleryTypeMap[docPartGalleryType]) {
    // TODO: Handle catching unkown gallery types
    return undefined;
  }

  const content = node?.elements.find((el) => el.name === 'w:sdtContent');
  const handler = validGalleryTypeMap[docPartGalleryType];
  const result = handler({ ...params, nodes: [content] });

  return result;
}

// /**
//  * Handler for docPartObject: docPartGallery node type of 'Table of contents'
//  * @param {*} node
//  * @param {*} docx
//  * @param {*} nodeListHandler
//  * @param {*} insideTrackChange
//  * @returns {Array} The processed nodes
//  */
export const tableOfContentsHandler = (params) => {
  return nodeListHandler.handler({ ...params, nodes: node.elements }); // TODO: check this function.
};

const validGalleryTypeMap = {
  'Table of Contents': tableOfContentsHandler,
};
