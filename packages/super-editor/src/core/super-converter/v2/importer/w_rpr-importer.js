import { translator } from '../../v3/handlers/w/rPr/rPr-translator.js';

/**
 * Run node handler
 * @param {import('./types').NodeHandlerParams} params
 */
export const wrPrHandler = (params) => {
  const { nodes } = params;
  if (nodes.length === 0 || nodes[0].name !== 'w:rPr') {
    return { nodes: [], consumed: 0 };
  }

  const result = translator.encode(params);
  return { nodes: [result], consumed: 1 };
};

export const wrprHandlerEntitiy = {
  handlerName: 'w:rPrHandler',
  handler: wrPrHandler,
};
