// @ts-check
import { translator } from '../../v3/handlers/w/r/r-translator.js';

/**
 * Run node handler
 * @param {import('./types').NodeHandlerParams} params
 */
export const handleRunNode = (params) => {
  const { nodes } = params;
  if (nodes.length === 0 || nodes[0].name !== 'w:r') {
    return { nodes: [], consumed: 0 };
  }

  const result = translator.encode(params);
  return {
    nodes: [result],
    consumed: 1,
  };
};

export const runNodeHandlerEntity = {
  handlerName: 'runNodeHandler',
  handler: handleRunNode,
};
