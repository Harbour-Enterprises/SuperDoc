import type { ParagraphAttrs, ParagraphBorders, ParagraphBorder, Run } from '@superdoc/contracts';

/**
 * Creates a deterministic hash string for a paragraph border.
 * Ensures consistent ordering regardless of JS engine property enumeration.
 *
 * @param border - The paragraph border to hash
 * @returns A deterministic hash string
 */
export const hashParagraphBorder = (border: ParagraphBorder): string => {
  const parts: string[] = [];
  if (border.style !== undefined) parts.push(`s:${border.style}`);
  if (border.width !== undefined) parts.push(`w:${border.width}`);
  if (border.color !== undefined) parts.push(`c:${border.color}`);
  if (border.space !== undefined) parts.push(`sp:${border.space}`);
  return parts.join(',');
};

/**
 * Creates a deterministic hash string for paragraph borders.
 * Hashes all four sides (top, right, bottom, left) in a consistent order.
 *
 * @param borders - The paragraph borders to hash
 * @returns A deterministic hash string
 */
export const hashParagraphBorders = (borders: ParagraphBorders): string => {
  const parts: string[] = [];
  if (borders.top) parts.push(`t:[${hashParagraphBorder(borders.top)}]`);
  if (borders.right) parts.push(`r:[${hashParagraphBorder(borders.right)}]`);
  if (borders.bottom) parts.push(`b:[${hashParagraphBorder(borders.bottom)}]`);
  if (borders.left) parts.push(`l:[${hashParagraphBorder(borders.left)}]`);
  return parts.join(';');
};

/**
 * Creates a deterministic hash string for paragraph-level attributes.
 * This is used for cache invalidation when paragraph formatting changes
 * (alignment, spacing, line height, indent, borders, shading, direction).
 *
 * The hash is deterministic to ensure consistent cache keys across different
 * JS engine property enumeration orders.
 *
 * @param attrs - The paragraph attributes to hash
 * @returns A deterministic hash string representing all paragraph attributes
 */
export const hashParagraphAttrs = (attrs: ParagraphAttrs | undefined): string => {
  if (!attrs) return '';

  const parts: string[] = [];

  // Alignment
  if (attrs.alignment) parts.push(`al:${attrs.alignment}`);

  // Spacing (includes line height)
  if (attrs.spacing) {
    const s = attrs.spacing;
    if (s.before !== undefined) parts.push(`sb:${s.before}`);
    if (s.after !== undefined) parts.push(`sa:${s.after}`);
    if (s.line !== undefined) parts.push(`sl:${s.line}`);
    if (s.lineRule) parts.push(`sr:${s.lineRule}`);
  }

  // Indentation
  if (attrs.indent) {
    const ind = attrs.indent;
    if (ind.left !== undefined) parts.push(`il:${ind.left}`);
    if (ind.right !== undefined) parts.push(`ir:${ind.right}`);
    if (ind.firstLine !== undefined) parts.push(`if:${ind.firstLine}`);
    if (ind.hanging !== undefined) parts.push(`ih:${ind.hanging}`);
  }

  // Borders
  if (attrs.borders) {
    parts.push(`br:${hashParagraphBorders(attrs.borders)}`);
  }

  // Shading
  if (attrs.shading) {
    const sh = attrs.shading;
    if (sh.fill) parts.push(`shf:${sh.fill}`);
    if (sh.color) parts.push(`shc:${sh.color}`);
  }

  // Direction and RTL
  if (attrs.direction) parts.push(`dir:${attrs.direction}`);
  if (attrs.rtl) parts.push('rtl');

  return parts.join(':');
};

/**
 * Type guard to check if a run has a string property.
 *
 * @param run - The run to check
 * @param prop - The property name to check
 * @returns True if the run has the property and it's a string
 */
export const hasStringProp = (run: Run, prop: string): run is Run & Record<string, string> => {
  return prop in run && typeof (run as Record<string, unknown>)[prop] === 'string';
};

/**
 * Type guard to check if a run has a number property.
 *
 * @param run - The run to check
 * @param prop - The property name to check
 * @returns True if the run has the property and it's a number
 */
export const hasNumberProp = (run: Run, prop: string): run is Run & Record<string, number> => {
  return prop in run && typeof (run as Record<string, unknown>)[prop] === 'number';
};

/**
 * Type guard to check if a run has a boolean property.
 *
 * @param run - The run to check
 * @param prop - The property name to check
 * @returns True if the run has the property and it's a boolean
 */
export const hasBooleanProp = (run: Run, prop: string): run is Run & Record<string, boolean> => {
  return prop in run && typeof (run as Record<string, unknown>)[prop] === 'boolean';
};

/**
 * Safely gets a string property from a run, with type narrowing.
 *
 * @param run - The run to get the property from
 * @param prop - The property name
 * @returns The string value or empty string if not present
 */
export const getRunStringProp = (run: Run, prop: string): string => {
  if (hasStringProp(run, prop)) {
    return run[prop];
  }
  return '';
};

/**
 * Safely gets a number property from a run, with type narrowing.
 *
 * @param run - The run to get the property from
 * @param prop - The property name
 * @returns The number value or 0 if not present
 */
export const getRunNumberProp = (run: Run, prop: string): number => {
  if (hasNumberProp(run, prop)) {
    return run[prop];
  }
  return 0;
};

/**
 * Safely gets a boolean property from a run, with type narrowing.
 *
 * @param run - The run to get the property from
 * @param prop - The property name
 * @returns The boolean value or false if not present
 */
export const getRunBooleanProp = (run: Run, prop: string): boolean => {
  if (hasBooleanProp(run, prop)) {
    return run[prop];
  }
  return false;
};
