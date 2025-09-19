// @ts-check

export const encode = (attributes) => attributes?.['w:val'];

export const decode = (attrs) => attrs?.color;

/** @type {import('@translator').AttrConfig} */
export const attrConfig = Object.freeze({
  xmlName: 'w:val',
  sdName: 'color',
  encode,
  decode,
});
