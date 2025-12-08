/**
 * Returns the default decimal separator for a given BCP 47 locale string.
 * Very lightweight mapping: ',' for most European locales, '.' otherwise.
 */
export function defaultDecimalSeparatorFor(locale: string | null | undefined): '.' | ',';
/**
 * Convenience: returns true if the default for this locale is ','.
 */
export function isCommaLocale(locale: string | null | undefined): boolean;
