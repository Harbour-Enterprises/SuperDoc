import type { ValidatorLogger } from '../types.js';

/**
 * Create special debug logger for SuperValidator and validators.
 */
export function createLogger(debug: boolean, additionalPrefixes: string[] = []): ValidatorLogger {
  const basePrefix = '[SuperValidator]';
  const style = 'color: teal; font-weight: bold;';

  const allPrefixes = [basePrefix, ...additionalPrefixes.map((p) => `[${p}]`)];
  const format = allPrefixes.map(() => '%c%s').join(' ');
  const styledPrefixes = allPrefixes.map((p) => [style, p]).flat();

  return {
    debug: (...args: unknown[]): void => {
      if (!debug) return;
      console.debug(format, ...styledPrefixes, ...args);
    },

    withPrefix: (prefix: string): ValidatorLogger => createLogger(debug, [...additionalPrefixes, prefix]),
  };
}
