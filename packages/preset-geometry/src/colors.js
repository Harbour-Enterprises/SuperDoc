/**
 * Normalizes a DrawingML fill attribute into a CSS-compatible fill value.
 *
 * @param {string|null|undefined} attr The raw fill attribute value.
 * @returns {string} The CSS fill value to use when rendering the path.
 */
export function resolveFill(attr) {
  if (attr == null) return 'currentColor';
  const raw = String(attr);
  const normalized = raw.toLowerCase();
  if (normalized === 'norm' || normalized === 'auto') return 'currentColor';
  if (normalized === 'none' || normalized === 'false' || normalized === 'transparent') {
    return 'none';
  }
  const presetShades = {
    darken: 'color-mix(in srgb, currentColor 60%, black)',
    darkenless: 'color-mix(in srgb, currentColor 80%, black)',
    lighten: 'color-mix(in srgb, currentColor 60%, white)',
    lightenless: 'color-mix(in srgb, currentColor 80%, white)',
    accent: 'var(--preset-accent, currentColor)',
    accentlight: 'color-mix(in srgb, currentColor 85%, white)',
  };
  if (normalized in presetShades) {
    return presetShades[normalized];
  }
  if (/^#|^rgb|^hsl|^var\(/i.test(attr)) return attr;
  return 'currentColor';
}

/**
 * Normalizes a DrawingML stroke attribute into a CSS-compatible stroke value.
 *
 * @param {string|null|undefined} attr The raw stroke attribute value.
 * @returns {string} The CSS stroke value to use when rendering the path.
 */
export function resolveStroke(attr) {
  if (attr == null) return 'currentColor';
  const normalized = attr.toLowerCase();
  if (normalized === 'none' || normalized === 'false') return 'none';
  if (/^#|^rgb|^hsl|^var\(/i.test(attr)) return attr;
  return 'currentColor';
}
