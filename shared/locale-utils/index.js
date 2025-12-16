/**
 * List of locales that use comma (,) as the default decimal separator.
 * This is a representative (not exhaustive) list covering common European and other locales.
 *
 * Included locales:
 * - de: German
 * - fr: French
 * - it: Italian
 * - es: Spanish
 * - nl: Dutch
 * - ru: Russian
 * - pl: Polish
 * - tr: Turkish
 * - sv: Swedish
 * - fi: Finnish
 * - da: Danish
 * - nb: Norwegian Bokmål
 * - cs: Czech
 * - sk: Slovak
 * - hu: Hungarian
 * - ro: Romanian
 * - uk: Ukrainian
 * - el: Greek
 * - pt-pt: Portuguese (Portugal) - special case; pt-BR uses dot
 * - sr: Serbian
 * - hr: Croatian
 * - bg: Bulgarian
 * - lt: Lithuanian
 * - lv: Latvian
 * - et: Estonian
 *
 * @type {ReadonlyArray<string>}
 */
const COMMA_LOCALES = Object.freeze([
  'de',
  'fr',
  'it',
  'es',
  'nl',
  'ru',
  'pl',
  'tr',
  'sv',
  'fi',
  'da',
  'nb',
  'cs',
  'sk',
  'hu',
  'ro',
  'uk',
  'el',
  'pt-pt',
  'sr',
  'hr',
  'bg',
  'lt',
  'lv',
  'et',
]);

/**
 * Returns the default decimal separator for a given BCP 47 locale string.
 *
 * This is a lightweight "best effort" utility for common locales. It maps comma (,)
 * for most European locales and dot (.) otherwise. The locale list is representative
 * but not exhaustive.
 *
 * Design decisions:
 * - Case-insensitive matching (DE, de, De all work)
 * - Handles both language-only codes (de) and language-region codes (de-DE)
 * - Returns dot (.) as the default for invalid/unknown input for safety
 * - Special handling for Portuguese: pt-PT uses comma, pt-BR uses dot
 * - Handles locales with script codes by checking the primary language code
 *
 * @param {string | null | undefined} locale - BCP 47 locale string (e.g., 'en', 'de-DE', 'pt-BR')
 * @returns {'.' | ','} The default decimal separator: '.' for dot locales, ',' for comma locales
 *
 * @example
 * // Comma locales
 * defaultDecimalSeparatorFor('de'); // ','
 * defaultDecimalSeparatorFor('de-DE'); // ','
 * defaultDecimalSeparatorFor('fr-FR'); // ','
 * defaultDecimalSeparatorFor('pt-PT'); // ','
 *
 * @example
 * // Dot locales
 * defaultDecimalSeparatorFor('en'); // '.'
 * defaultDecimalSeparatorFor('en-US'); // '.'
 * defaultDecimalSeparatorFor('pt-BR'); // '.'
 * defaultDecimalSeparatorFor('ja'); // '.'
 *
 * @example
 * // Case insensitive
 * defaultDecimalSeparatorFor('DE'); // ','
 * defaultDecimalSeparatorFor('Fr-FR'); // ','
 *
 * @example
 * // Edge cases - all return '.'
 * defaultDecimalSeparatorFor(null); // '.'
 * defaultDecimalSeparatorFor(undefined); // '.'
 * defaultDecimalSeparatorFor(''); // '.'
 * defaultDecimalSeparatorFor('invalid'); // '.'
 */
export function defaultDecimalSeparatorFor(locale) {
  // Guard against invalid input: always return dot (.) for safety
  if (typeof locale !== 'string' || !locale) return '.';

  const lc = locale.toLowerCase();

  // Extract primary language code (before first hyphen)
  const primary = lc.split('-')[0];

  // Check if either the full locale string or primary language code is in the comma list
  if (COMMA_LOCALES.includes(primary) || COMMA_LOCALES.includes(lc)) return ',';

  // Special-case Portuguese: pt-BR uses dot (.), pt-PT uses comma (,) and is in the list
  if (lc.startsWith('pt') && lc !== 'pt-pt') return '.';

  // Default to dot (.) for all other cases
  return '.';
}

/**
 * Convenience function to check if a locale uses comma as the default decimal separator.
 *
 * This is equivalent to checking if `defaultDecimalSeparatorFor(locale) === ','`.
 *
 * @param {string | null | undefined} locale - BCP 47 locale string (e.g., 'en', 'de-DE', 'pt-BR')
 * @returns {boolean} True if the locale uses comma (,) as the decimal separator, false otherwise
 *
 * @example
 * // Comma locales
 * isCommaLocale('de'); // true
 * isCommaLocale('fr-FR'); // true
 * isCommaLocale('pt-PT'); // true
 *
 * @example
 * // Dot locales
 * isCommaLocale('en'); // false
 * isCommaLocale('pt-BR'); // false
 * isCommaLocale('ja'); // false
 *
 * @example
 * // Edge cases
 * isCommaLocale(null); // false
 * isCommaLocale(undefined); // false
 * isCommaLocale(''); // false
 */
export function isCommaLocale(locale) {
  return defaultDecimalSeparatorFor(locale) === ',';
}
