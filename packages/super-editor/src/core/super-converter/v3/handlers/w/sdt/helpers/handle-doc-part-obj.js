// Debug flag - set to true to enable logging
const DEBUG_DOC_PART_OBJ = true;

const logDocPartObj = (stage, data) => {
  if (!DEBUG_DOC_PART_OBJ) return;
  console.log(`[DOC-PART-OBJ] [${stage}]`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
};

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

  logDocPartObj('GALLERY_TYPE', docPartGalleryType);
  logDocPartObj('HAS_HANDLER', !!validGalleryTypeMap[docPartGalleryType]);

  if (!docPartGalleryType || !validGalleryTypeMap[docPartGalleryType]) {
    logDocPartObj('SKIPPED', `Unknown gallery type: ${docPartGalleryType}`);
    return null;
  }

  const content = node?.elements.find((el) => el.name === 'w:sdtContent');
  logDocPartObj('CONTENT_ELEMENTS', content?.elements?.map((e) => e.name) || 'none');

  const handler = validGalleryTypeMap[docPartGalleryType];
  const result = handler({
    ...params,
    nodes: [content],
    extraParams: { ...(params.extraParams || {}), sdtPr },
  });

  logDocPartObj('RESULT', result?.map?.((r) => ({ type: r.type, attrs: r.attrs })) || result);

  return result;
}

export const tableOfContentsHandler = (params) => {
  const node = params.nodes[0];
  const translatedContent = params.nodeListHandler.handler({
    ...params,
    nodes: node.elements,
    path: [...(params.path || []), node],
  });
  const sdtPr = params.extraParams.sdtPr;
  const id = sdtPr.elements?.find((el) => el.name === 'w:id')?.attributes['w:val'] || '';

  const result = {
    type: 'documentPartObject',
    content: translatedContent,
    attrs: {
      id,
      docPartGallery: 'Table of Contents',
      docPartUnique: true,
    },
  };
  return result;
};

/**
 * Handler for page number gallery types.
 * Passes through the content to be processed by the node list handler,
 * returning the translated content directly (e.g., page-number nodes).
 * @param {Object} params
 * @returns {Array}
 */
export const pageNumbersHandler = (params) => {
  const node = params.nodes[0];

  logDocPartObj('PAGE_NUM_INPUT', node?.elements?.map((e) => e.name) || 'none');

  // Log framePr if present in any paragraph
  node?.elements?.forEach((el, i) => {
    if (el.name === 'w:p') {
      const pPr = el.elements?.find((e) => e.name === 'w:pPr');
      const framePr = pPr?.elements?.find((e) => e.name === 'w:framePr');
      if (framePr) {
        logDocPartObj(`PAGE_NUM_FRAME_PR[${i}]`, framePr.attributes);
      }
    }
  });

  const translatedContent = params.nodeListHandler.handler({
    ...params,
    nodes: node.elements,
    path: [...(params.path || []), node],
  });

  logDocPartObj('PAGE_NUM_OUTPUT', translatedContent?.map?.((r) => ({ type: r.type, attrs: r.attrs })) || translatedContent);

  return translatedContent;
};

const validGalleryTypeMap = {
  'Table of Contents': tableOfContentsHandler,
  'Page Numbers (Top of Page)': pageNumbersHandler,
  'Page Numbers (Bottom of Page)': pageNumbersHandler,
};
