// @ts-check
import { translator as wPNodeTranslator } from '../../v3/handlers/w/r/r-translator.js';

/**
 * Run node handler
 * @param {import('../../v3/node-translator').SCEncoderConfig} params
 * @returns {Object} Handler result
 */
export const handleRunNode = (params) => {
  const { nodes } = params;
  if (nodes.length === 0 || nodes[0].name !== 'w:r') {
    return { nodes: [], consumed: 0 };
  }
  if (nodes.length === 0 || nodes[0].name !== 'w:r') {
    return { nodes: [], consumed: 0 };
  }

  const schemaNode = wPNodeTranslator.encode(params);
  const newNodes = schemaNode ? [schemaNode] : [];
  return { nodes: newNodes, consumed: 1 };
};

/**
 * Run node handler entity
 * @type {Object} Handler entity
 */
export const runNodeHandlerEntity = {
  handlerName: 'runNodeHandler',
  handler: handleRunNode,
};
