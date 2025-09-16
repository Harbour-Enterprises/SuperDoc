// @ts-check
import { translator as rFontsTranslator } from '../../v3/handlers/w/rFonts/rFonts-translator.js';

/**
 * rFonts node handler (w:rFonts)
 * @param {import('../../v3/node-translator').SCEncoderConfig} params
 * @returns {Object} Handler result
 */
const handleRFontsNode = (params) => {
  const { nodes } = params;
  if (!nodes?.length || nodes[0].name !== 'w:rFonts') {
    return { nodes: [], consumed: 0 };
  }
  const node = rFontsTranslator.encode(params);
  return { nodes: [node], consumed: 1 };
};

/**
 * rFonts node handler entity
 * @type {Object} Handler entity
 */
export const rFontsNodeEntityHandler = {
  handlerName: 'w:rFontsTranslator',
  handler: handleRFontsNode,
};
