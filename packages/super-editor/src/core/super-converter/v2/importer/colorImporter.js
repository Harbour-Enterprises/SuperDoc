// @ts-check
import { translator as colorTranslator } from '../../v3/handlers/w/color/color-translator.js';

/**
 * Color node handler (w:color)
 * @param {import('../../v3/node-translator').SCEncoderConfig} params
 * @returns {Object} Handler result
 */
const handleColorNode = (params) => {
  const { nodes } = params;
  if (!nodes.length || nodes[0].name !== 'w:color') {
    return { nodes: [], consumed: 0 };
  }
  const node = colorTranslator.encode(params);
  return { nodes: [node], consumed: 1 };
};

/**
 * Color node handler entity
 * @type {Object} Handler entity
 */
export const colorNodeEntityHandler = {
  handlerName: 'w:colorTranslator',
  handler: handleColorNode,
};
