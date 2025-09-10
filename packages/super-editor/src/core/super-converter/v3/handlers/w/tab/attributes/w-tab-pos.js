// @ts-check

/**
 * Maps `w:pos` on <w:tab> to `pos` in SuperDoc.
 * @param {Object} attributes
 * @returns {string|undefined}
 */
export const encode = (attributes) => {
  return attributes['w:pos'];
};

/**
 * Maps `pos` in SuperDoc back to `w:pos`.
 * @param {Object} attrs
 * @returns {string|undefined}
 */
export const decode = (attrs) => {
  const { pos } = attrs || {};
  return pos;
};

/** @type {import('@translator').AttrConfig} */
export const attrConfig = Object.freeze({
  xmlName: 'w:pos',
  sdName: 'pos',
  encode,
  decode,
});
