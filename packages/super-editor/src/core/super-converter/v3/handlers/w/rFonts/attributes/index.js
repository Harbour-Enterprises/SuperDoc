/** @type {import('@translator').AttrConfig[]} */
const attrs = [
  { xmlName: 'w:ascii', sdName: 'fontFamily', encode: (a) => a?.['w:ascii'] },
  { xmlName: 'w:hAnsi', sdName: 'fontFamily', encode: (a) => a?.['w:hAnsi'] },
  { xmlName: 'w:eastAsia', sdName: 'fontFamily', encode: (a) => a?.['w:eastAsia'] },
  { xmlName: 'w:cs', sdName: 'fontFamily', encode: (a) => a?.['w:cs'] },
  { xmlName: 'w:val', sdName: 'fontFamily', encode: (a) => a?.['w:val'] },
];

export default attrs;

