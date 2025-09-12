import { translator } from '../../v3/handlers/w/u/u-translator.js';

/**
 * w:u handler (bridges import to v3 attribute translator)
 * @param {import('./types').NodeHandlerParams} params
 */
export const wuHandler = (params) => {
  const { nodes } = params;
  if (nodes.length === 0 || nodes[0].name !== 'w:u') {
    return { nodes: [], consumed: 0 };
  }

  const result = translator.encode(params);
  return { nodes: [result], consumed: 1 };
};

export const wuHandlerEntity = {
  handlerName: 'w:uHandler',
  handler: wuHandler,
};
