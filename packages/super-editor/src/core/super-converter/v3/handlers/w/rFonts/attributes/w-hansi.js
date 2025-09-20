// @ts-check

export const encode = (attributes) => attributes?.['w:hAnsi'];

export const decode = (attrs) => attrs?.hAnsi;

/** @type {import('@translator').AttrConfig} */
export const attrConfig = Object.freeze({
  xmlName: 'w:hAnsi',
  sdName: 'hAnsi',
  encode,
  decode,
});
