// @ts-check

export const encode = (attributes) => attributes?.['w:cs'];

export const decode = (attrs) => attrs?.cs;

/** @type {import('@translator').AttrConfig} */
export const attrConfig = Object.freeze({
  xmlName: 'w:cs',
  sdName: 'cs',
  encode,
  decode,
});
