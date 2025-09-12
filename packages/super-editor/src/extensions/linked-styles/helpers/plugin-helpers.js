// @ts-check
import { Decoration } from 'prosemirror-view';
import { generateLinkedStyleString, getLinkedStyle } from './helpers.js';

/**
 * Generate a style decoration for a node
 * @param {String | Object} styleId
 * @param {Array} styles
 * @param {Object} state
 * @param {Object} node
 * @param {Number} pos
 * @returns {Decoration|null}
 */
export const generateStyleDecoration = (styleId, styles, state, node, pos) => {
  if (styleId instanceof Object) {
    styleId = styleId.attributes?.['w:val'];
  }

  const { linkedStyle, basedOnStyle } = getLinkedStyle(styleId, styles);
  if (!linkedStyle) return;

  const $pos = state.doc.resolve(pos);
  const parent = $pos.parent;

  const styleString = generateLinkedStyleString(linkedStyle, basedOnStyle, node, parent);
  if (!styleString) return;

  return Decoration.inline(pos, pos + node.nodeSize, { style: styleString });
};

/**
 * Check if a node has a styleId attribute
 * @param {Object} node
 * @returns {String | undefined}
 */
export const checkNodeHasStyleId = (node) => {
  // Paragraph/node-level styleId
  const styleId = node?.attrs?.styleId;
  if (styleId) return styleId;

  // Run-level style via v3 runProperties array
  const rProps = node?.attrs?.runProperties;
  if (Array.isArray(rProps)) {
    const entry = rProps.find((e) => (e?.xmlName || e?.name) === 'w:rStyle');
    const rStyle = entry?.attributes?.['w:val'];
    if (rStyle) return rStyle;
  }

  return undefined;
};
