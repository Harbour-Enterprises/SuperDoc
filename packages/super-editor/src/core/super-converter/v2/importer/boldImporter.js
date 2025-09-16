// @ts-check
import { translator as bNodeTranslator } from '../../v3/handlers/w/b/b-translator.js';

/**
 * Tab node handler
 * @param {import('../../v3/node-translator').SCEncoderConfig} params
 * @returns {Object} Handler result
 */
const handleBoldNode = (params) => {
  const { nodes } = params;
  if (!nodes.length || nodes[0].name !== 'w:b') {
    return { nodes: [], consumed: 0 };
  }

  const node = bNodeTranslator.encode(params);
  return { nodes: [node], consumed: 1 };
};

/**
 * Tab node handler entity
 * @type {Object} Handler entity
 */
export const boldNodeEntityHandler = {
  handlerName: 'w:boldTranslator',
  handler: handleBoldNode,
};
