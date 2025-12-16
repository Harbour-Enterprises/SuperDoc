/**
 * Check if the object is empty.
 */
export function isEmptyObject(value: Record<string, unknown> = {}): boolean {
  return Object.keys(value).length === 0 && value.constructor === Object;
}
