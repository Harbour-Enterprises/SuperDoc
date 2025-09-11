import { translator } from '../../v3/handlers/w/strike/strike-translator.js';

/**
 * w:strike handler (bridges import to v3 attribute translator)
 * @param {import('./types').NodeHandlerParams} params
 */
export const wStrikeHandler = (params) => {
  const { nodes } = params;
  if (nodes.length === 0 || nodes[0].name !== 'w:strike') {
    return { nodes: [], consumed: 0 };
  }

  const result = translator.encode(params);
  return { nodes: [result], consumed: 1 };
};

export const wStrikeHandlerEntity = {
  handlerName: 'w:strikeHandler',
  handler: wStrikeHandler,
};
