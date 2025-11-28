import { isRegExp } from './isRegExp.js';

/**
 * Check if obj1 includes obj2
 */
export function objectIncludes(
  obj1: Record<string, unknown>,
  obj2: Record<string, unknown>,
  options: { strict: boolean } = { strict: true },
): boolean {
  const keys = Object.keys(obj2);
  if (!keys.length) return true;
  return keys.every((key) => {
    const value1 = obj1[key];
    const value2 = obj2[key];

    if (options.strict) {
      return value2 === value1;
    }

    if (isRegExp(value2)) {
      // Type guard: ensure value1 can be tested by the RegExp
      if (typeof value1 === 'string' || typeof value1 === 'number') {
        return value2.test(String(value1));
      }
      return false;
    }

    return value2 === value1;
  });
}
