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
  const result = handler({
    ...params,
    nodes: [content],
    extraParams: { ...(params.extraParams || {}), sdtPr },
  });

  return result;
}

export const tableOfContentsHandler = (params) => {
  const node = params.nodes[0];
  const translatedContent = params.nodeListHandler.handler({
    ...params,
    nodes: node.elements,
    path: [...(params.path || []), node],
  });
  const normalizedContent = normalizeDocPartContent(translatedContent);
  const sdtPr = params.extraParams.sdtPr;
  const id = sdtPr.elements?.find((el) => el.name === 'w:id')?.attributes['w:val'] || '';

  const result = {
    type: 'documentPartObject',
    content: normalizedContent,
    attrs: {
      id,
      docPartGallery: 'Table of Contents',
      docPartUnique: true,
    },
  };
  return result;
};

const validGalleryTypeMap = {
  'Table of Contents': tableOfContentsHandler,
};

const inlineNodeTypes = new Set(['bookmarkStart', 'bookmarkEnd']);
const wrapInlineNode = (node) => ({
  type: 'paragraph',
  content: [node],
});

export const normalizeDocPartContent = (nodes = []) => {
  const normalized = [];
  nodes.forEach((node) => {
    if (inlineNodeTypes.has(node?.type)) {
      normalized.push(wrapInlineNode(node));
    } else {
      normalized.push(node);
    }
  });
  return normalized;
};
