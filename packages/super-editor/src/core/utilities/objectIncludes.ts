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
    if (options.strict) return obj2[key] === obj1[key];
    if (isRegExp(obj2[key])) return obj2[key].test(obj1[key]);
    return obj2[key] === obj1[key];
  });
}
