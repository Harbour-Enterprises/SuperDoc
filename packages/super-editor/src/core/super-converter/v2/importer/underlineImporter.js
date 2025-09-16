// @ts-check
import { translator as uNodeTranslator } from '../../v3/handlers/w/u/u-translator.js';

/**
 * Underline node handler
 * @param {import('../../v3/node-translator').SCEncoderConfig} params
 * @returns {Object} Handler result
 */
const handleUnderlineNode = (params) => {
  const { nodes } = params;
  if (!nodes.length || nodes[0].name !== 'w:u') {
    return { nodes: [], consumed: 0 };
  }
  const node = uNodeTranslator.encode(params);
  return { nodes: [node], consumed: 1 };
};

/**
 * Underline node handler entity
 * @type {Object} Handler entity
 */
export const underlineNodeEntityHandler = {
  handlerName: 'w:underlineTranslator',
  handler: handleUnderlineNode,
};
