/**
 *
 * @returns {NodeListHandler}
 */
export const createNodeListHandlerMock = () => {
  return {
    handlerEntities: [
      {
        handlerName: 'standardNodeHandler',
        handler: () => ({
          nodes: [
            {
              type: 'standardNodeHandler',
              content: {},
              attrs: {},
              marks: [],
            },
          ],
          consumed: 1,
        }),
      },
      {
        handlerName: 'textNodeHandler',
        handler: () => ({
          nodes: [
            {
              type: 'textNodeHandler',
              content: {},
              attrs: {},
              marks: [],
            },
          ],
          consumed: 1,
        }),
      },
    ],
    handler: () => [{ type: 'dummyNode', content: {}, attrs: {} }],
  };
};

test.skip('', () => {});

/**
 * Get text from a ProseMirror node by recursively traversing its content
 * @param {Object} node The ProseMirror node to get the text from
 * @returns {string} The concatenated text from the node
 */
export const getTextFromProseMirrorNode = (node) => {
  if (!node) return '';
  
  // If it's a text node, return its text
  if (node.type === 'text') {
    return node.text || '';
  }
  
  // If it has content, recursively get text from all content nodes
  if (node.content && Array.isArray(node.content)) {
    return node.content.map(getTextFromProseMirrorNode).join('');
  }
  
  return '';
};