/**
 * @type {import("docxImporter").NodeHandler}
 */
const handleAutoPageNumber = (params) => {
  const { nodes } = params;
  if (nodes.length === 0 || nodes[0].name !== 'sd:autoPageNumber') {
    return { nodes: [], consumed: 0 };
  }

  const processedNode = {
    type: 'page-number',
  };
  return { nodes: [processedNode], consumed: 1 };
};

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const autoPageHandlerEntity = {
  handlerName: 'autoPageNumberHandler',
  handler: handleAutoPageNumber,
};

/**
 * @type {import("docxImporter").NodeHandler}
 */
const handleAutoTotalPageNumber = (params) => {
  const { nodes } = params;
  if (nodes.length === 0 || nodes[0].name !== 'sd:totalPageNumber') {
    return { nodes: [], consumed: 0 };
  }

  const processedNode = {
    type: 'total-page-number',
  };
  return { nodes: [processedNode], consumed: 1 };
};

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const autoTotalPageCountEntity = {
  handlerName: 'autoTotalPageCountEntity',
  handler: handleAutoTotalPageNumber,
};
