// @ts-check
import { isRunPropertiesNode } from './is-run-properties-node.js';
import { extractRunProperties } from './extract-run-properties.js';

/**
 * Separates and processes run properties and content nodes
 * @param {any[]} children
 * @param {any} params
 * @param {{ handler: Function }} nodeListHandler
 * @returns {{ runProperties: any, contentNodes: any[] }}
 */
export function processNodeChildren(children, params, nodeListHandler) {
  if (!Array.isArray(children)) {
    return { runProperties: {}, contentNodes: [] };
  }

  // Separate run properties from content
  const runPropertiesNode = children.find(isRunPropertiesNode);
  const contentChildren = children.filter((el) => !isRunPropertiesNode(el));

  // Process content nodes
  const contentNodes =
    nodeListHandler.handler({
      ...params,
      nodes: contentChildren,
    }) || [];

  // Extract run properties if they exist
  const extracted = runPropertiesNode ? extractRunProperties(runPropertiesNode, params, nodeListHandler) : {};

  return { runProperties: extracted, contentNodes };
}
