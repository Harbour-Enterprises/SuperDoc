// @ts-check

/**
 * Attribute handler for w:val on <w:i>.
 */
export const encode = (attributes) => {
  const raw = attributes?.['w:val'];
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;
  const v = String(raw).trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'off') return false;
  if (v === '1' || v === 'true' || v === 'on') return true;
  return undefined;
};

export const decode = (attrs) => {
  if (attrs?.italic === false) return '0';
  return undefined;
};

/** @type {import('@translator').AttrConfig} */
export const attrConfig = Object.freeze({ xmlName: 'w:val', sdName: 'italic', encode, decode });

