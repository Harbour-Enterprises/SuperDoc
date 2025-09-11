import { translator } from '../../v3/handlers/w/bdr/bdr-translator.js';

/**
 * w:bdr handler (bridges import to v3 attribute translator)
 * @param {import('./types').NodeHandlerParams} params
 */
export const wbdrHandler = (params) => {
  const { nodes } = params;
  if (nodes.length === 0 || nodes[0].name !== 'w:bdr') {
    return { nodes: [], consumed: 0 };
  }

  const result = translator.encode(params);
  return { nodes: [result], consumed: 1 };
};

export const wbdrHandlerEntity = {
  handlerName: 'w:bdrHandler',
  handler: wbdrHandler,
};
