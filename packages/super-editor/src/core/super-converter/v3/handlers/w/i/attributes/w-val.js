// @ts-check

export const encode = (attributes) => {
  const raw = attributes?.['w:val'];
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;

  const val = String(raw).trim().toLowerCase();
  if (val === '0' || val === 'false' || val === 'off') return false;
  if (val === '1' || val === 'true' || val === 'on') return true;
  return undefined;
};

export const decode = (attrs) => {
  if (attrs?.italic === false) return '0';
  return undefined;
};

/** @type {import('@translator').AttrConfig} */
export const attrConfig = Object.freeze({
  xmlName: 'w:val',
  sdName: 'italic',
  encode,
  decode,
});
