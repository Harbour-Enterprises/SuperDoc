/**
 * Retrieves a configuration field from an extension.
 * First checks extension.config[field], then falls back to extension[field].
 *
 * @param extension - The extension object to query (can be any object with optional config property)
 * @param field - The field name to retrieve
 * @param context - Optional context to bind function values to
 * @returns The field value, potentially bound to context if it's a function
 */
export const getExtensionConfigField = <T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extension: any,
  field: string,
  context?: unknown,
): T => {
  if (extension.config?.[field] === undefined && extension[field] === undefined) {
    return undefined as T;
  }

  // Check config first (primary source), then fall back to direct property
  const value = extension.config?.[field] ?? extension[field];

  if (typeof value === 'function' && context) {
    return value.bind(context) as T;
  }

  return value as T;
};
