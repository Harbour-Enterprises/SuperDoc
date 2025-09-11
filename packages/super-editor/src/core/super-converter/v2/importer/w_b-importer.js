import { translator } from '../../v3/handlers/w/b/b-translator.js';

/**
 * w:b handler (bridges import to v3 attribute translator)
 * @param {import('./types').NodeHandlerParams} params
 */
export const wbHandler = (params) => {
  const { nodes } = params;
  if (nodes.length === 0 || nodes[0].name !== 'w:b') {
    return { nodes: [], consumed: 0 };
  }

  const result = translator.encode(params);
  return { nodes: [result], consumed: 1 };
};

export const wbHandlerEntity = {
  handlerName: 'w:bHandler',
  handler: wbHandler,
};
