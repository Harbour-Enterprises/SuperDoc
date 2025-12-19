/**
 * Spacing & Indent Normalization Module
 *
 * Functions for converting spacing and indent between pixels and points,
 * and normalizing raw attributes.
 */

import type { ParagraphAttrs, ParagraphIndent, ParagraphSpacing } from '@superdoc/contracts';
import type { ComputedParagraphStyle, EngineParagraphSpacing, EngineParagraphIndent } from '../types.js';
import { pxToPt, ptToPx, twipsToPx, pickNumber } from '../utilities.js';

/**
 * Maximum line spacing multiplier for auto line spacing.
 *
 * OOXML auto line spacing uses multipliers (e.g., 1.5 for 1.5x line spacing).
 * Values above this threshold are assumed to be twips values instead.
 *
 * Rationale: Typical multipliers are 1.0-3.0. The minimum meaningful twips
 * value for line spacing is ~240 (12pt font), so 10 provides a safe boundary.
 */
const MAX_AUTO_LINE_MULTIPLIER = 10;

/**
 * Threshold for distinguishing pixel values from twips in indent values.
 *
 * Values with absolute value <= 50 are treated as already-converted pixels.
 * Values > 50 are treated as twips and converted to pixels.
 *
 * Limitation: This creates an ambiguous zone where legitimate pixel values
 * 51-100 will be incorrectly converted from twips. This is a known limitation
 * of the heuristic approach used when the source format is ambiguous.
 */
const TWIPS_THRESHOLD = 50;

/**
 * Converts paragraph spacing from pixels to points for the style engine.
 *
 * Transforms spacing values (before, after, line) from pixel measurements
 * to point measurements while preserving the lineRule property.
 *
 * @param spacing - Paragraph spacing object with values in pixels
 * @returns Spacing object with values in points for the style engine
 *
 * @example
 * ```typescript
 * spacingPxToPt({ before: 16, after: 16, line: 20 });
 * // { before: 12, after: 12, line: 15 }
 * ```
 */
export const spacingPxToPt = (spacing: ParagraphSpacing): ComputedParagraphStyle['spacing'] => {
  const result: ComputedParagraphStyle['spacing'] = {};
  if (spacing.before != null) result.before = pxToPt(spacing.before);
  if (spacing.after != null) result.after = pxToPt(spacing.after);
  if (spacing.line != null) result.line = pxToPt(spacing.line);
  if (spacing.lineRule) result.lineRule = spacing.lineRule;
  return result;
};

/**
 * Converts paragraph indent from pixels to points for the style engine.
 *
 * Transforms indent values (left, right, firstLine, hanging) from pixel
 * measurements to point measurements.
 *
 * @param indent - Paragraph indent object with values in pixels
 * @returns Indent object with values in points for the style engine
 *
 * @example
 * ```typescript
 * indentPxToPt({ left: 48, firstLine: 24 });
 * // { left: 36, firstLine: 18 }
 * ```
 */
export const indentPxToPt = (indent: ParagraphIndent): ComputedParagraphStyle['indent'] => {
  const result: ComputedParagraphStyle['indent'] = {};
  if (indent.left != null) result.left = pxToPt(indent.left);
  if (indent.right != null) result.right = pxToPt(indent.right);
  if (indent.firstLine != null) result.firstLine = pxToPt(indent.firstLine);
  if (indent.hanging != null) result.hanging = pxToPt(indent.hanging);
  return result;
};

/**
 * Converts paragraph spacing from points to pixels.
 *
 * Uses the rawSpacing parameter to determine which properties to convert,
 * only converting properties that exist in the raw spacing.
 *
 * @param spacing - Computed spacing from style engine with values in points
 * @param rawSpacing - Original raw spacing to determine which properties to include
 * @returns Spacing object with values in pixels, or undefined if rawSpacing is not provided or results in no properties
 *
 * @example
 * ```typescript
 * spacingPtToPx({ before: 12, after: 12 }, { before: 16, after: 16 });
 * // { before: 16, after: 16 }
 * ```
 */
export const spacingPtToPx = (
  spacing: EngineParagraphSpacing,
  rawSpacing?: ParagraphSpacing,
): ParagraphSpacing | undefined => {
  const result: ParagraphSpacing = {};
  if (rawSpacing) {
    if (rawSpacing.before != null) {
      const before = ptToPx(spacing.before);
      if (before != null) result.before = before;
    }
    if (rawSpacing.after != null) {
      const after = ptToPx(spacing.after);
      if (after != null) result.after = after;
    }
    if (rawSpacing.line != null) {
      const line = ptToPx(spacing.line);
      if (line != null) result.line = line;
      if (spacing.lineRule) result.lineRule = spacing.lineRule;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

/**
 * Converts paragraph indent from points to pixels.
 *
 * Transforms indent values from point measurements to pixel measurements.
 * Preserves explicit zero values for firstLine and hanging since these are meaningful
 * overrides (e.g., style setting firstLine=0 to override numbering level's firstLine).
 * Filters out zero values for left/right to keep the result object minimal.
 *
 * @param indent - Computed indent from style engine with values in points
 * @returns Indent object with values in pixels, or undefined if no values to preserve
 *
 * @example
 * ```typescript
 * indentPtToPx({ left: 36, firstLine: 18 });
 * // { left: 48, firstLine: 24 }
 *
 * // Zero firstLine is preserved (explicit override)
 * indentPtToPx({ left: 0, firstLine: 0 });
 * // { firstLine: 0 }
 * ```
 */
export const indentPtToPx = (indent: EngineParagraphIndent): ParagraphIndent | undefined => {
  const result: ParagraphIndent = {};
  const left = ptToPx(indent.left);
  const right = ptToPx(indent.right);
  const firstLine = ptToPx(indent.firstLine);
  const hanging = ptToPx(indent.hanging);
  // Filter out zero for left/right (purely cosmetic)
  if (left != null && left !== 0) result.left = left;
  if (right != null && right !== 0) result.right = right;
  // Preserve zero for firstLine/hanging - these are meaningful overrides
  // (e.g., style setting firstLine=0 to cancel numbering level's firstLine indent)
  if (firstLine != null) result.firstLine = firstLine;
  if (hanging != null) result.hanging = hanging;
  return Object.keys(result).length > 0 ? result : undefined;
};

/**
 * Normalizes paragraph alignment values from OOXML format.
 *
 * Maps OOXML alignment values to standard alignment format. Case-sensitive.
 * Converts 'start'/'end' to 'left'/'right'. Unknown values return undefined.
 *
 * IMPORTANT: 'left' must return 'left' (not undefined) so that explicit left alignment
 * from paragraph properties can override style-based center/right alignment.
 *
 * @param value - OOXML alignment value ('center', 'right', 'justify', 'start', 'end', 'left')
 * @returns Normalized alignment value, or undefined if invalid
 *
 * @example
 * ```typescript
 * normalizeAlignment('center'); // 'center'
 * normalizeAlignment('left'); // 'left'
 * normalizeAlignment('start'); // 'left'
 * normalizeAlignment('end'); // 'right'
 * normalizeAlignment('CENTER'); // undefined (case-sensitive)
 * ```
 */
type NormalizedParagraphAlignment = Exclude<ParagraphAttrs['alignment'], 'both'>;

export const normalizeAlignment = (value: unknown): NormalizedParagraphAlignment => {
  switch (value) {
    case 'center':
    case 'right':
    case 'justify':
    case 'left':
      return value;
    case 'both':
    case 'distribute':
    case 'numTab':
    case 'thaiDistribute':
      return 'justify';
    case 'end':
      return 'right';
    case 'start':
      return 'left';
    default:
      return undefined;
  }
};

/**
 * Normalizes paragraph spacing from raw OOXML attributes.
 *
 * Converts spacing values from twips to pixels, handling both standard OOXML
 * properties (before, after, line) and alternative properties (lineSpaceBefore, lineSpaceAfter).
 * For auto line spacing, values <= 10 are treated as multipliers, larger values as twips.
 *
 * @param value - Raw OOXML spacing object with properties like before, after, line, lineRule
 * @returns Normalized spacing object with values in pixels, or undefined if no valid spacing
 *
 * @example
 * ```typescript
 * normalizeParagraphSpacing({ before: 240, after: 240, line: 360, lineRule: 'auto' });
 * // { before: 16, after: 16, line: 1.5, lineRule: 'auto' } (line is multiplier)
 *
 * normalizeParagraphSpacing({ before: 240, line: 480, lineRule: 'exact' });
 * // { before: 16, line: 32, lineRule: 'exact' } (line converted from twips)
 * ```
 */
type ExtendedParagraphSpacing = ParagraphSpacing & { contextualSpacing?: boolean };

export const normalizeParagraphSpacing = (value: unknown): ExtendedParagraphSpacing | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const spacing: ExtendedParagraphSpacing = {};

  const beforeRaw = pickNumber(source.before);
  const afterRaw = pickNumber(source.after);
  const lineRaw = pickNumber(source.line);
  const lineRule = normalizeLineRule(source.lineRule);
  const beforeAutospacing = toBooleanFlag(source.beforeAutospacing ?? source.beforeAutoSpacing);
  const afterAutospacing = toBooleanFlag(source.afterAutospacing ?? source.afterAutoSpacing);
  const contextualSpacing = toBooleanFlag(source.contextualSpacing);

  const before = beforeRaw != null ? twipsToPx(beforeRaw) : pickNumber(source.lineSpaceBefore);
  const after = afterRaw != null ? twipsToPx(afterRaw) : pickNumber(source.lineSpaceAfter);
  const line = normalizeLineValue(lineRaw, lineRule);

  if (before != null) spacing.before = before;
  if (after != null) spacing.after = after;
  if (line != null) spacing.line = line;
  if (lineRule) spacing.lineRule = lineRule;
  if (beforeAutospacing != null) spacing.beforeAutospacing = beforeAutospacing;
  if (afterAutospacing != null) spacing.afterAutospacing = afterAutospacing;
  if (contextualSpacing != null) spacing.contextualSpacing = contextualSpacing;

  return Object.keys(spacing).length > 0 ? spacing : undefined;
};

const toBooleanFlag = (value: unknown): boolean | undefined => {
  if (value === true || value === false) return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'off', 'no'].includes(normalized)) return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return undefined;
};

const normalizeLineValue = (
  value: number | undefined,
  lineRule: ParagraphSpacing['lineRule'] | undefined,
): number | undefined => {
  if (value == null) return undefined;
  if (lineRule === 'auto') {
    if (value > 0 && value <= MAX_AUTO_LINE_MULTIPLIER) {
      return value;
    }
    return twipsToPx(value);
  }
  return twipsToPx(value);
};

/**
 * Normalizes line rule values from OOXML format.
 *
 * Validates and returns line rule if it's one of the valid values.
 *
 * @param value - OOXML line rule value ('auto', 'exact', or 'atLeast')
 * @returns Normalized line rule value, or undefined if invalid
 *
 * @example
 * ```typescript
 * normalizeLineRule('auto'); // 'auto'
 * normalizeLineRule('exact'); // 'exact'
 * normalizeLineRule('invalid'); // undefined
 * ```
 */
export const normalizeLineRule = (value: unknown): ParagraphSpacing['lineRule'] => {
  if (value === 'auto' || value === 'exact' || value === 'atLeast') {
    return value;
  }
  return undefined;
};

/**
 * Normalizes indent values that are already in pixels.
 *
 * Uses heuristics to detect if values are actually in twips (not pixels):
 * - Values >= 50 are likely twips (50px would be ~667 twips in OOXML)
 * - Values divisible by 15 with high precision are likely twips (common in OOXML)
 *
 * If values look like twips, returns undefined to trigger twips conversion instead.
 * Epsilon of 1e-6 accounts for floating point arithmetic errors.
 *
 * @param value - Indent object with values assumed to be in pixels
 * @returns Indent object if values are in pixels, or undefined if they look like twips
 *
 * @example
 * ```typescript
 * normalizePxIndent({ left: 24, firstLine: 12 });
 * // { left: 24, firstLine: 12 } (values look like pixels)
 *
 * normalizePxIndent({ left: 720, firstLine: 360 });
 * // undefined (values >= 50, likely twips)
 * ```
 */
export const normalizePxIndent = (value: unknown): ParagraphIndent | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const indent: ParagraphIndent = {};
  const values: number[] = [];
  (['left', 'right', 'firstLine', 'hanging'] as const).forEach((key) => {
    const raw = source[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      indent[key] = raw;
      values.push(Math.abs(raw));
    }
  });
  if (!values.length) return undefined;

  /**
   * Heuristic for detecting twips values:
   * 1. Values >= 50 are likely twips (50px = ~667 twips, invalid as px in OOXML context)
   * 2. Non-zero twips values often divisible by 15 (e.g., half-point increments)
   *
   * Note: Zero is explicitly excluded from the divisibility check because it's a valid
   * pixel value that happens to be divisible by 15. Zero indent is meaningful (explicit
   * reset) and should not trigger twips conversion.
   *
   * Epsilon of 1e-6 accounts for floating point arithmetic errors.
   */
  const looksLikeTwips = values.some((val) => val >= 50 || (val !== 0 && Math.abs(val % 15) < 1e-6));
  if (looksLikeTwips) {
    return undefined;
  }
  return indent;
};

/**
 * Normalizes paragraph indent from raw OOXML attributes, converting from twips if needed.
 *
 * Uses a threshold-based heuristic to detect the unit:
 * - Values with absolute value <= 50 are treated as already-converted pixels
 * - Values > 50 are treated as twips and converted to pixels
 *
 * Limitation: This creates an ambiguous zone where legitimate pixel values 51-100
 * will be incorrectly converted from twips. This is a known limitation of the
 * heuristic approach when source format is ambiguous.
 *
 * @param value - Raw OOXML indent object with properties like left, right, firstLine, hanging
 * @returns Normalized indent object with values in pixels, or undefined if no valid indent
 *
 * @example
 * ```typescript
 * normalizeParagraphIndent({ left: 720, firstLine: 360 });
 * // { left: 48, firstLine: 24 } (converted from twips)
 *
 * normalizeParagraphIndent({ left: 24, firstLine: 12 });
 * // { left: 24, firstLine: 12 } (treated as pixels)
 * ```
 */
export const normalizeParagraphIndent = (value: unknown): ParagraphIndent | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const indent: ParagraphIndent = {};

  const convert = (value?: number): number | undefined => {
    const num = pickNumber(value);
    if (num == null) return undefined;
    // Treat small values as already-converted px (SuperDoc stores px in PM attrs)
    if (Math.abs(num) <= TWIPS_THRESHOLD) {
      return num;
    }
    return twipsToPx(Number(num));
  };

  const left = convert(pickNumber(source.left));
  const right = convert(pickNumber(source.right));
  const firstLine = convert(pickNumber(source.firstLine));
  const hanging = convert(pickNumber(source.hanging));

  if (left != null) indent.left = left;
  if (right != null) indent.right = right;
  if (firstLine != null) indent.firstLine = firstLine;
  if (hanging != null) indent.hanging = hanging;

  return Object.keys(indent).length > 0 ? indent : undefined;
};
