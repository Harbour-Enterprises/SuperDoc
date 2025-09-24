// @ts-check

export const encode = (attributes) => attributes?.['w:ascii'];

export const decode = (attrs) => attrs?.ascii;

/** @type {import('@translator').AttrConfig} */
export const attrConfig = Object.freeze({
  xmlName: 'w:ascii',
  sdName: 'ascii',
  encode,
  decode,
});
