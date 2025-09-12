// @ts-check

/**
 * Checks if a node is a run properties node (w:rPr)
 * @param {any} element
 * @returns {boolean}
 */
export function isRunPropertiesNode(element) {
  return element?.name === 'w:rPr';
}
