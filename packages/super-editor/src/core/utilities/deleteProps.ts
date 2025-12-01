/**
 * Delete a property or an array of properties from an object.
 */
export function deleteProps<T extends Record<string, unknown>>(obj: T, propOrProps: string | string[]): Partial<T> {
  const props = typeof propOrProps === 'string' ? [propOrProps] : propOrProps;

  const removeNested = (target: unknown, pathParts: string[], index = 0): boolean => {
    if (!target || typeof target !== 'object') {
      return false;
    }

    // Type guard to ensure we can access properties
    const targetObj = target as Record<string, unknown>;
    const key = pathParts[index];
    const isLast = index === pathParts.length - 1;

    if (!(key in targetObj)) {
      return Object.keys(targetObj).length === 0;
    }

    if (isLast) {
      delete targetObj[key];
    } else {
      const shouldDeleteChild = removeNested(targetObj[key], pathParts, index + 1);
      if (shouldDeleteChild) {
        delete targetObj[key];
      }
    }

    return Object.keys(targetObj).length === 0;
  };

  const clonedObj: Record<string, unknown> = JSON.parse(JSON.stringify(obj));
  props.forEach((propPath: string) => {
    if (!propPath.includes('.')) {
      delete clonedObj[propPath];
      return;
    }

    removeNested(clonedObj, propPath.split('.'));
  });

  return Object.entries(clonedObj).reduce<Partial<T>>((acc, [key, value]) => {
    if (value == null) {
      return acc;
    }

    if (typeof value === 'object' && value !== null && Object.keys(value as object).length === 0) {
      return acc;
    }

    (acc as Record<string, unknown>)[key] = value;
    return acc;
  }, {} as Partial<T>);
}
