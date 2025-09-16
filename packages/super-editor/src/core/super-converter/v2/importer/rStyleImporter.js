// @ts-check
import { translator as rStyleTranslator } from '../../v3/handlers/w/rStyle/rstyle-translator.js';

/**
 * Tab node handler
 * @param {import('../../v3/node-translator').SCEncoderConfig} params
 * @returns {Object} Handler result
 */
const handleRStyleNode = (params) => {
  const { nodes } = params;
  if (!nodes?.length || nodes[0].name !== 'w:rStyle') {
    return { nodes: [], consumed: 0 };
  }
  const node = rStyleTranslator.encode(params);
  return { nodes: [node], consumed: 1 };
};

/**
 * Tab node handler entity
 * @type {Object} Handler entity
 */
export const rStyleNodeEntityHandler = {
  handlerName: 'w:rStyle',
  handler: handleRStyleNode,
};
