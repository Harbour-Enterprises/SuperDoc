// @ts-check
import { translator } from '../../v3/handlers/passthrough/index.js';

/**
 * Passthrough node handler that wraps unrecognized OOXML nodes and preserves
 * their original XML for round-tripping.
 * @type {import('./docxImporter.js').NodeHandler}
 */
export const handler = (params) => {
  const { nodes } = params;
  if (!nodes || nodes.length === 0) {
    return { nodes: [], consumed: 0 };
  }

  const result = translator.encode(params);
  if (!result) return { nodes: [], consumed: 0 };

  return {
    nodes: [result],
    consumed: 1,
  };
};

/** @type {import('./docxImporter.js').NodeHandlerEntry} */
export const passthroughNodeHandlerEntity = {
  handlerName: 'passthroughNodeHandler',
  handler,
};
