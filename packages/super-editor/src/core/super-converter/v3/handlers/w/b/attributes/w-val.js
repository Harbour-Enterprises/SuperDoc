// @ts-check

/**
 * Attribute handler for w:val on <w:b>.
 * Encodes explicit false; presence without w:val implies true and is handled at translator level.
 */

/**
 * @param {Record<string, string>} attributes
 * @returns {boolean|undefined}
 */
export const encode = (attributes) => {
  const raw = attributes?.['w:val'];
  if (raw === undefined || raw === null) return undefined;

  // Handle native boolean/number forms defensively
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;

  const val = String(raw).trim().toLowerCase();
  if (val === '0' || val === 'false' || val === 'off') return false;
  if (val === '1' || val === 'true' || val === 'on') return true;

  // Unrecognized: fall back to translator default (presence => true)
  return undefined;
};

/**
 * Decode from runProps.bold into w:val (rarely needed; true usually omits w:val).
 * @param {Record<string, any>} runProps
 * @returns {string|undefined}
 */
export const decode = (runProps) => {
  if (runProps?.bold === false) return '0';
  return undefined;
};

/** @type {import('@translator').AttrConfig} */
export const attrConfig = Object.freeze({
  xmlName: 'w:val',
  sdName: 'bold',
  encode,
  decode,
});
