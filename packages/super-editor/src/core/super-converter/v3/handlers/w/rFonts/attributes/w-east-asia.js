// @ts-check

export const encode = (attributes) => attributes?.['w:eastAsia'];

export const decode = (attrs) => attrs?.eastAsia;

/** @type {import('@translator').AttrConfig} */
export const attrConfig = Object.freeze({
  xmlName: 'w:eastAsia',
  sdName: 'eastAsia',
  encode,
  decode,
});
