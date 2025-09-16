// @ts-check
import { translator as highlightTranslator } from '../../v3/handlers/w/highlight/highlight-translator.js';

/**
 * Highlight node handler (w:highlight)
 * @param {import('../../v3/node-translator').SCEncoderConfig} params
 * @returns {Object} Handler result
 */
const handleHighlightNode = (params) => {
  const { nodes } = params;
  if (!nodes.length || nodes[0].name !== 'w:highlight') {
    return { nodes: [], consumed: 0 };
  }
  const node = highlightTranslator.encode(params);
  return { nodes: [node], consumed: 1 };
};

/**
 * Highlight node handler entity
 * @type {Object} Handler entity
 */
export const highlightNodeEntityHandler = {
  handlerName: 'w:highlightTranslator',
  handler: handleHighlightNode,
};
