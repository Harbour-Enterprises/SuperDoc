import { isEmptyObject } from '../utilities/isEmptyObject.js';

type UnknownRecord = Record<string, unknown>;

/**
 * Clean schema item from "null" and "undefined" values.
 * @param schemaItem Schema item.
 * @returns Cleaned schema item.
 */
export function cleanSchemaItem<T extends UnknownRecord>(schemaItem: T): Partial<T> {
  const entries = Object.entries(schemaItem).filter(([key, value]) => {
    if (key === 'attrs' && isEmptyObject(value as UnknownRecord)) {
      return false;
    }
    return value !== null && value !== undefined;
  });
  return Object.fromEntries(entries) as Partial<T>;
}
