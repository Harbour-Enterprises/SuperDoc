// @ts-check

export const encode = (attributes) => attributes?.['w:id'];
export const decode = (attrs) => attrs?.id;

/** @type {import('@translator').AttrConfig} */
export const attrConfig = Object.freeze({
  xmlName: 'w:id',
  sdName: 'id',
  encode,
  decode,
});
