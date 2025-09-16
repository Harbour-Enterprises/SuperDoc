/** @type {import('@translator').AttrConfig[]} */
const attrs = [
  {
    xmlName: 'w:val',
    sdName: 'highlight',
    encode: (a) => a?.['w:val'],
    decode: (attrs) => attrs?.highlight,
  },
];

export default attrs;

