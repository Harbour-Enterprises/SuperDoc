import { translator } from '../../v3/handlers/w/rFonts/index.js';

/**
 * Run node handler
 * @param {import('./types').NodeHandlerParams} params
 */
export const wrFonts = (params) => {
  const { nodes } = params;
  if (nodes.length === 0 || nodes[0].name !== 'w:rFonts') {
    return { nodes: [], consumed: 0 };
  }

  const result = translator.encode(params);
  return { nodes: [result], consumed: 1 };
};

export const wrFontsHandlerEntity = {
  handlerName: 'w:rFontsHandler',
  handler: wrFonts,
};
