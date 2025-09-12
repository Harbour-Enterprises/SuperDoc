import { translator } from '../../v3/handlers/w/i/i-translator.js';

/**
 * w:i handler (bridges import to v3 attribute translator)
 * @param {import('./types').NodeHandlerParams} params
 */
export const wiHandler = (params) => {
  const { nodes } = params;
  if (nodes.length === 0 || nodes[0].name !== 'w:i') {
    return { nodes: [], consumed: 0 };
  }

  const result = translator.encode(params);
  return { nodes: [result], consumed: 1 };
};

export const wiHandlerEntity = {
  handlerName: 'w:iHandler',
  handler: wiHandler,
};
