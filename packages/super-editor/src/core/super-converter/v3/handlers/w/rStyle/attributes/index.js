/** @type {import('@translator').AttrConfig[]} */
const attrs = [
  { xmlName: 'w:val', sdName: 'styleId', encode: (a) => a?.['w:val'], decode: (attrs) => attrs?.styleId },
];

export default attrs;

