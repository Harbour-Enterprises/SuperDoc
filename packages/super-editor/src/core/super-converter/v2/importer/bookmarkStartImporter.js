// @ts-check
import { translator as wBookmarkStartTranslator } from '../../v3/handlers/w/bookmark-start/index.js';

/**
 * Bookmark start node handler
 * @param {import('../../v3/node-translator').SCEncoderConfig} params
 * @returns {Object} Handler result
 */
export const handleBookmarkStartNode = (params) => {
  const { nodes } = params;
  if (!nodes.length || nodes[0].name !== 'w:bookmarkStart') {
    return { nodes: [], consumed: 0 };
  }

  const node = wBookmarkStartTranslator.encode(params);
  if (!node) return { nodes: [], consumed: 0 };

  return { nodes: [node], consumed: 1 };
};

/**
 * Bookmark start node handler entity
 * @type {Object} Handler entity
 */
export const bookmarkStartNodeHandlerEntity = {
  handlerName: 'w:bookmarkStartTranslator',
  handler: handleBookmarkStartNode,
};
