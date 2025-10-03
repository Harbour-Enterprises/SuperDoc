// @ts-check

export const decode = (attrs) => attrs?.displacedByCustomXml;

/** @type {import('@translator').AttrConfig} */
export const attrConfig = Object.freeze({
  xmlName: 'w:displacedByCustomXml',
  sdName: 'displacedByCustomXml',
  encode: () => {},
  decode,
});
