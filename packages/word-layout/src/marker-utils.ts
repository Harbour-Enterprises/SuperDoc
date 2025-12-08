import type { ResolvedNumberingProperties, ResolvedRunProperties } from './types.js';

/**
 * Union type representing all supported numbering format types.
 * These formats determine how list markers are displayed.
 */
export type NumberingFormat = 'bullet' | 'decimal' | 'lowerLetter' | 'upperLetter' | 'lowerRoman' | 'upperRoman';

/**
 * Default hanging indent for list items in pixels.
 * This value determines the horizontal offset between the marker and the text content.
 */
export const DEFAULT_LIST_HANGING_PX = 18;

/**
 * Gap between the list marker and the text content in pixels.
 * This spacing ensures visual separation between the marker and the paragraph text.
 */
export const LIST_MARKER_GAP = 8;

/**
 * Default bullet character used when no specific bullet glyph is provided.
 * The bullet point (•) is the standard Unicode character for unordered lists.
 */
export const DEFAULT_BULLET_GLYPH = '•';

const DEFAULT_DECIMAL_PATTERN = '%1.';

// ASCII code constants for alphabetic conversion
const ASCII_UPPERCASE_A = 65;
const ASCII_LOWERCASE_A = 97;
const ALPHABET_SIZE = 26;

const ROMAN_NUMERALS: Array<[number, string]> = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

/**
 * Converts a positive integer to alphabetic representation (Excel-style column naming).
 * Uses base-26 numbering where 1='a', 26='z', 27='aa', 52='az', 53='ba', etc.
 *
 * @param value - The positive integer to convert (must be >= 1)
 * @param uppercase - Whether to use uppercase letters (A-Z) or lowercase (a-z)
 *
 * @returns The alphabetic representation, or empty string if value is invalid
 *
 * @example
 * ```typescript
 * toAlpha(1, false);    // Returns: "a"
 * toAlpha(26, false);   // Returns: "z"
 * toAlpha(27, false);   // Returns: "aa"
 * toAlpha(52, false);   // Returns: "az"
 * toAlpha(702, false);  // Returns: "zz"
 * toAlpha(703, false);  // Returns: "aaa"
 * toAlpha(1, true);     // Returns: "A"
 * toAlpha(26, true);    // Returns: "Z"
 * toAlpha(27, true);    // Returns: "AA"
 * toAlpha(0, false);    // Returns: "" (invalid)
 * toAlpha(-5, false);   // Returns: "" (invalid)
 * toAlpha(NaN, false);  // Returns: "" (invalid)
 * ```
 *
 * @remarks
 * - Returns empty string for non-finite values (NaN, Infinity, -Infinity)
 * - Returns empty string for zero or negative values
 * - Decimal values are floored to the nearest integer
 * - This is a bijective base-26 system: no "zero" value exists, so 'a' = 1
 */
const toAlpha = (value: number, uppercase: boolean): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }
  let num = Math.floor(value);
  let result = '';
  while (num > 0) {
    num--;
    const mod = num % ALPHABET_SIZE;
    result = String.fromCharCode((uppercase ? ASCII_UPPERCASE_A : ASCII_LOWERCASE_A) + mod) + result;
    num = Math.floor(num / ALPHABET_SIZE);
  }
  return result;
};

/**
 * Converts a positive integer to Roman numeral representation.
 * Supports values from 1 to 3999 using standard Roman numeral notation with subtractive rules.
 *
 * @param value - The positive integer to convert (1-3999)
 * @param uppercase - Whether to use uppercase (I, V, X, etc.) or lowercase (i, v, x, etc.)
 *
 * @returns The Roman numeral string, or empty string if value is invalid
 *
 * @example
 * ```typescript
 * toRoman(1, true);     // Returns: "I"
 * toRoman(4, true);     // Returns: "IV"
 * toRoman(9, true);     // Returns: "IX"
 * toRoman(40, true);    // Returns: "XL"
 * toRoman(90, true);    // Returns: "XC"
 * toRoman(400, true);   // Returns: "CD"
 * toRoman(900, true);   // Returns: "CM"
 * toRoman(1994, true);  // Returns: "MCMXCIV"
 * toRoman(3999, true);  // Returns: "MMMCMXCIX"
 * toRoman(4, false);    // Returns: "iv"
 * toRoman(0, true);     // Returns: "" (invalid)
 * toRoman(-5, true);    // Returns: "" (invalid)
 * toRoman(NaN, true);   // Returns: "" (invalid)
 * ```
 *
 * @remarks
 * - Returns empty string for non-finite values (NaN, Infinity, -Infinity)
 * - Returns empty string for zero or negative values
 * - Decimal values are floored to the nearest integer
 * - Uses subtractive notation: IV (4), IX (9), XL (40), XC (90), CD (400), CM (900)
 * - Maximum supported value is 3999 (MMMCMXCIX)
 * - Values above 3999 will produce valid output but are non-standard
 */
const toRoman = (value: number, uppercase: boolean): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }
  let num = Math.floor(value);
  let result = '';
  for (const [romanValue, glyph] of ROMAN_NUMERALS) {
    while (num >= romanValue) {
      result += glyph;
      num -= romanValue;
    }
  }
  return uppercase ? result : result.toLowerCase();
};

/**
 * Formats a number as a decimal string representation.
 * Non-finite values return empty string, and decimal values are floored to integers.
 *
 * @param value - The number to format
 *
 * @returns The decimal string representation, or empty string if value is non-finite
 *
 * @example
 * ```typescript
 * formatDecimal(1);      // Returns: "1"
 * formatDecimal(42);     // Returns: "42"
 * formatDecimal(0);      // Returns: "0"
 * formatDecimal(-5);     // Returns: "-5"
 * formatDecimal(3.7);    // Returns: "3"
 * formatDecimal(9.99);   // Returns: "9"
 * formatDecimal(NaN);    // Returns: ""
 * formatDecimal(Infinity);  // Returns: ""
 * formatDecimal(-Infinity); // Returns: ""
 * ```
 *
 * @remarks
 * - Returns empty string for NaN, Infinity, or -Infinity
 * - Decimal values are floored (truncated towards negative infinity)
 * - Negative numbers are preserved (e.g., -5 becomes "-5")
 */
const formatDecimal = (value: number): string => {
  if (!Number.isFinite(value)) return '';
  return String(Math.floor(value));
};

/**
 * Applies a numbering format to a value, converting it to the appropriate string representation.
 * Supports decimal, alphabetic (upper/lower), and Roman numeral (upper/lower) formats.
 *
 * @param value - The number to format
 * @param format - The format type to apply. If undefined or unrecognized, defaults to decimal
 *
 * @returns The formatted string representation
 *
 * @example
 * ```typescript
 * applyFormat(5, 'decimal');      // Returns: "5"
 * applyFormat(5, 'lowerLetter');  // Returns: "e"
 * applyFormat(5, 'upperLetter');  // Returns: "E"
 * applyFormat(5, 'lowerRoman');   // Returns: "v"
 * applyFormat(5, 'upperRoman');   // Returns: "V"
 * applyFormat(5, undefined);      // Returns: "5" (default to decimal)
 * applyFormat(5, 'unknown');      // Returns: "5" (default to decimal)
 * applyFormat(27, 'lowerLetter'); // Returns: "aa"
 * applyFormat(1994, 'upperRoman'); // Returns: "MCMXCIV"
 * ```
 *
 * @remarks
 * - Undefined or unrecognized format defaults to decimal formatting
 * - See {@link toAlpha}, {@link toRoman}, and {@link formatDecimal} for format-specific behavior
 * - Invalid values (NaN, Infinity, negative, zero) are handled by individual format functions
 */
const applyFormat = (value: number, format?: NumberingFormat): string => {
  switch (format) {
    case 'lowerLetter':
      return toAlpha(value, false);
    case 'upperLetter':
      return toAlpha(value, true);
    case 'lowerRoman':
      return toRoman(value, false);
    case 'upperRoman':
      return toRoman(value, true);
    default:
      return formatDecimal(value);
  }
};

/**
 * Formats the display text for a list marker based on numbering properties.
 *
 * This function handles various list formats including bullets, decimals, Roman numerals,
 * and alphabetic numbering. It supports multi-level numbering patterns like "1.2.3." by
 * replacing placeholder patterns (%1, %2, etc.) with actual counter values.
 *
 * @param numbering - The numbering properties containing format, pattern, and counter path.
 *   If null or undefined, returns an empty string.
 * @param numbering.format - The numbering format: 'bullet', 'decimal', 'lowerRoman', 'upperRoman',
 *   'lowerLetter', or 'upperLetter'
 * @param numbering.lvlText - The pattern template (e.g., "%1.", "%1.%2."). For bullets, this is
 *   the actual bullet character to display.
 * @param numbering.path - Array of counter values for each level (e.g., [1, 2, 3] for "1.2.3.")
 * @param numbering.start - Fallback start value if path is not provided
 *
 * @returns The formatted marker text ready for display (e.g., "3.", "IV)", "aa.", "•")
 *
 * @example
 * ```typescript
 * // Decimal numbering
 * formatMarkerText({
 *   numId: '1',
 *   ilvl: 0,
 *   format: 'decimal',
 *   lvlText: '%1.',
 *   path: [5]
 * }); // Returns: "5."
 *
 * // Multi-level decimal
 * formatMarkerText({
 *   numId: '1',
 *   ilvl: 2,
 *   format: 'decimal',
 *   lvlText: '%1.%2.%3.',
 *   path: [1, 2, 3]
 * }); // Returns: "1.2.3."
 *
 * // Roman numerals
 * formatMarkerText({
 *   numId: '2',
 *   ilvl: 0,
 *   format: 'upperRoman',
 *   lvlText: '%1)',
 *   path: [4]
 * }); // Returns: "IV)"
 *
 * // Bullet
 * formatMarkerText({
 *   numId: '3',
 *   ilvl: 0,
 *   format: 'bullet',
 *   lvlText: '▪'
 * }); // Returns: "▪"
 * ```
 */
export const formatMarkerText = (numbering?: ResolvedNumberingProperties | null): string => {
  if (!numbering) {
    return '';
  }
  const path = numbering.path && numbering.path.length ? numbering.path : [numbering.start ?? 1];
  if (numbering.format === 'bullet') {
    return numbering.lvlText || DEFAULT_BULLET_GLYPH;
  }
  const pattern = numbering.lvlText || DEFAULT_DECIMAL_PATTERN;
  return pattern.replace(/%(\d+)/g, (_, lvlIndex) => {
    const index = Number(lvlIndex) - 1;
    const value = path[index] ?? path[path.length - 1] ?? 1;
    return applyFormat(value, numbering.format);
  });
};

/**
 * Builds a CSS font shorthand string from resolved run properties.
 *
 * This function constructs a valid CSS font shorthand value that can be used for
 * canvas text measurement or CSS font styling. The format follows the CSS font
 * specification: [style] [weight] size family.
 *
 * @param run - The resolved run properties containing font styling information
 * @param run.fontFamily - The font family name (defaults to "Times New Roman" if falsy)
 * @param run.fontSize - The font size in pixels (defaults to 12 if falsy, clamped to 1-999px)
 * @param run.italic - Whether the font should be italic
 * @param run.bold - Whether the font should be bold
 *
 * @returns A CSS font shorthand string (e.g., "italic bold 14px Arial")
 *
 * @example
 * ```typescript
 * buildFontCss({
 *   fontFamily: 'Arial',
 *   fontSize: 14,
 *   bold: true,
 *   italic: false
 * }); // Returns: "bold 14px Arial"
 *
 * buildFontCss({
 *   fontFamily: 'Georgia',
 *   fontSize: 16,
 *   bold: true,
 *   italic: true
 * }); // Returns: "italic bold 16px Georgia"
 *
 * buildFontCss({
 *   fontFamily: 'Calibri',
 *   fontSize: 12
 * }); // Returns: "12px Calibri"
 *
 * buildFontCss({
 *   fontFamily: 'Arial',
 *   fontSize: 14.7
 * }); // Returns: "14px Arial" (decimal floored)
 *
 * buildFontCss({
 *   fontFamily: 'Arial',
 *   fontSize: -5
 * }); // Returns: "1px Arial" (clamped to minimum)
 *
 * buildFontCss({
 *   fontFamily: 'Arial',
 *   fontSize: 10000
 * }); // Returns: "999px Arial" (clamped to maximum)
 * ```
 *
 * @remarks
 * - Font size is clamped to the range [1, 999] pixels
 * - Decimal font sizes are floored to the nearest integer
 * - Non-finite font sizes (NaN, Infinity) default to 12px
 * - Multi-word font families should be provided without quotes (quotes handled by CSS)
 */
export const buildFontCss = (run: ResolvedRunProperties): string => {
  const style = run.italic ? 'italic ' : '';
  const weight = run.bold ? 'bold ' : '';

  // Validate and normalize font size
  let fontSize = run.fontSize ?? 12;
  if (!Number.isFinite(fontSize)) {
    fontSize = 12;
  }
  fontSize = Math.floor(fontSize);
  fontSize = Math.max(1, Math.min(999, fontSize));

  const size = `${fontSize}px`;
  const family = run.fontFamily ?? 'Times New Roman';
  return `${style}${weight}${size} ${family}`;
};
