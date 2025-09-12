import { translator } from '../../v3/handlers/w/color/color-translator.js';

/**
 * w:color handler (bridges import to v3 attribute translator)
 * @param {import('./types').NodeHandlerParams} params
 */
export const wColorHandler = (params) => {
  const { nodes } = params;
  if (nodes.length === 0 || nodes[0].name !== 'w:color') {
    return { nodes: [], consumed: 0 };
  }

  const result = translator.encode(params);
  return { nodes: [result], consumed: 1 };
};

export const wColorHandlerEntity = {
  handlerName: 'w:colorHandler',
  handler: wColorHandler,
};
