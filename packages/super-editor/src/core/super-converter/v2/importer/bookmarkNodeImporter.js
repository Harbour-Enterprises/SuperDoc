/**
 * @type {import("docxImporter").NodeHandler}
 */
export const handleBookmarkNode = (params) => {
  const { nodes, nodeListHandler, editor } = params;
  if (nodes.length === 0 || nodes[0].name !== 'w:bookmarkStart') {
    return { nodes: [], consumed: 0 };
  }
  const node = nodes[0];
  const handleStandardNode = nodeListHandler.handlerEntities.find(
    (e) => e.handlerName === 'standardNodeHandler',
  )?.handler;
  if (!handleStandardNode) {
    console.error('Standard node handler not found');
    return { nodes: [], consumed: 0 };
  }

  // Check if this bookmark is a custom mark
  const customMarks = editor?.extensionService?.extensions?.filter((e) => e.isExternal === true) || [];
  const bookmarkName = node.attributes['w:name']?.split(';')[0];
  const customMark = customMarks.find((mark) => mark.name === bookmarkName);
  if (customMark) {
    const bookmarkEndIndex = nodes.findIndex(
      (n) => n.name === 'w:bookmarkEnd' && n.attributes['w:id'] === node.attributes['w:id'],
    );
    const textNodes = nodes.slice(1, bookmarkEndIndex);

    const nodeListHandler = params.nodeListHandler;
    const attrs = {};
    node.attributes['w:name'].split(';').forEach((name) => {
      const [key, value] = name.split('=');
      if (key && value) {
        attrs[key] = value;
      }
    });

    const translatedText = nodeListHandler.handler({ ...params, nodes: textNodes });
    translatedText.forEach((n) => {
      n.marks.push({
        type: customMark.name,
        attrs,
      });
    });
    return {
      nodes: translatedText,
      consumed: translatedText.length + 2,
    };
  }

  // Default behaviour – treat standard Word bookmarks as a wrapper around the
  // content up until the matching bookmarkEnd.
  const bookmarkEndIndex = nodes.findIndex(
    (n) => n.name === 'w:bookmarkEnd' && n.attributes['w:id'] === node.attributes['w:id'],
  );

  // If we can’t find the closing tag we’ll just fall back to the old behaviour.
  if (bookmarkEndIndex === -1) {
    const updatedParams = { ...params, nodes: [node] };
    const fallback = handleStandardNode(updatedParams);
    if (fallback.nodes.length === 1) {
      fallback.nodes[0].attrs.name = node.attributes['w:name'];
      fallback.nodes[0].attrs.id = node.attributes['w:id'];
    }
    return fallback;
  }

  // Translate everything between start- and end-tags.
  const innerNodes = nodes.slice(1, bookmarkEndIndex);
  const translatedInner = nodeListHandler.handler({ ...params, nodes: innerNodes });

  const bookmarkWrapperNode = {
    type: 'bookmarkStart',
    attrs: {
      name: node.attributes['w:name'],
      id: node.attributes['w:id'],
    },
    content: translatedInner,
    marks: [],
  };

  return { nodes: [bookmarkWrapperNode], consumed: bookmarkEndIndex + 1 };
};

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const bookmarkNodeHandlerEntity = {
  handlerName: 'bookmarkNodeHandler',
  handler: handleBookmarkNode,
};
