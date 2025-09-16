// @ts-check
import { translator as strikeTranslator } from '../../v3/handlers/w/strike/strike-translator.js';

/**
 * Strike node handler (w:strike)
 * @param {import('../../v3/node-translator').SCEncoderConfig} params
 * @returns {Object} Handler result
 */
const handleStrikeNode = (params) => {
  const { nodes } = params;
  if (!nodes.length || nodes[0].name !== 'w:strike') {
    return { nodes: [], consumed: 0 };
  }
  const node = strikeTranslator.encode(params);
  return { nodes: [node], consumed: 1 };
};

/**
 * Strike node handler entity
 * @type {Object} Handler entity
 */
export const strikeNodeEntityHandler = {
  handlerName: 'w:strikeTranslator',
  handler: handleStrikeNode,
};
