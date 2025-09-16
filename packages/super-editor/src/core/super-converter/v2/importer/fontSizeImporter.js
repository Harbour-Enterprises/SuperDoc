// @ts-check
import { translator as szTranslator } from '../../v3/handlers/w/sz/sz-translator.js';
import { translator as szCsTranslator } from '../../v3/handlers/w/szcs/szcs-translator.js';

/**
 * Font size node handler (w:sz, w:szCs)
 * @param {import('../../v3/node-translator').SCEncoderConfig} params
 * @returns {Object} Handler result
 */
const handleFontSizeNode = (params) => {
  const { nodes } = params;
  if (!nodes.length) return { nodes: [], consumed: 0 };
  const n = nodes[0];
  if (n.name !== 'w:sz' && n.name !== 'w:szCs') return { nodes: [], consumed: 0 };

  const node = n.name === 'w:sz' ? szTranslator.encode(params) : szCsTranslator.encode(params);
  return { nodes: [node], consumed: 1 };
};

/**
 * Font size node handler entity
 * @type {Object} Handler entity
 */
export const fontSizeNodeEntityHandler = {
  handlerName: 'w:fontSizeTranslator',
  handler: handleFontSizeNode,
};
