// @ts-check

/**
 * Maps `w:val` on <w:tab> to `tabSize` in SuperDoc.
 * @param {Object} attributes
 * @returns {string|undefined}
 */
export const encode = (attributes) => {
  return attributes['w:val'];
};

/**
 * Maps `tabSize` in SuperDoc back to `w:val`.
 * @param {Object} attrs
 * @returns {string|undefined}
 */
export const decode = (attrs) => {
  const { tabSize } = attrs || {};
  return tabSize;
};

/** @type {import('@translator').AttrConfig} */
export const attrConfig = Object.freeze({
  xmlName: 'w:val',
  sdName: 'tabSize',
  encode,
  decode,
});
