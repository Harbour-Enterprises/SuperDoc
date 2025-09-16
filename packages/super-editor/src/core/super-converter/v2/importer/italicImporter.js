// @ts-check
import { translator as iNodeTranslator } from '../../v3/handlers/w/i/i-translator.js';

/**
 * Tab node handler
 * @param {import('../../v3/node-translator').SCEncoderConfig} params
 * @returns {Object} Handler result
 */
const handleItalicNode = (params) => {
  const { nodes } = params;
  if (!nodes.length || nodes[0].name !== 'w:i') {
    return { nodes: [], consumed: 0 };
  }

  const node = iNodeTranslator.encode(params);
  return { nodes: [node], consumed: 1 };
};

/**
 * Tab node handler entity
 * @type {Object} Handler entity
 */
export const italicNodeEntityHandler = {
  handlerName: 'w:italicTranslator',
  handler: handleItalicNode,
};
