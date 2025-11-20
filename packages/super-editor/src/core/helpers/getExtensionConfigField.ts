/**
 * Base interface for extensions with a config object.
 */
export interface ExtensionLike {
  config: Record<string, any>;
}

/**
 * Get extension config field.
 * If the field is a function, it will be bound to the provided context.
 * @param extension The Editor extension.
 * @param field The config field name.
 * @param context The context object to bind to function.
 * @returns The config field value or bound function.
 */
export function getExtensionConfigField<T = any>(
  extension: ExtensionLike,
  field: string,
  context: Record<string, any> = {}
): T {
  const fieldValue = extension.config[field];

  if (typeof fieldValue === 'function') {
    const boundValue = fieldValue.bind({ ...context });
    return boundValue as T;
  }

  return fieldValue as T;
}
