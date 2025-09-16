/** @type {import('@translator').AttrConfig[]} */
const attrs = [
  {
    xmlName: 'w:val',
    sdName: 'color',
    encode: (a) => a?.['w:val'],
    decode: (attrs) => {
      const c = attrs?.color;
      if (!c) return undefined;
      return String(c).replace(/^#/, '');
    },
  },
];

export default attrs;

