/**
 * Delete a property or an array of properties from an object.
 */
export function deleteProps(obj: Record<string, unknown>, propOrProps: string | string[]): Record<string, unknown> {
  const props = typeof propOrProps === 'string' ? [propOrProps] : propOrProps;

  const removeNested = (target: unknown, pathParts: string[], index = 0): boolean => {
    if (!target || typeof target !== 'object') {
      return false;
    }

    const key = pathParts[index];
    const isLast = index === pathParts.length - 1;

    if (!(key in target)) {
      return Object.keys(target).length === 0;
    }

    if (isLast) {
      delete target[key];
    } else {
      const shouldDeleteChild = removeNested(target[key], pathParts, index + 1);
      if (shouldDeleteChild) {
        delete target[key];
      }
    }

    return Object.keys(target).length === 0;
  };

  const clonedObj: Record<string, unknown> = JSON.parse(JSON.stringify(obj));
  props.forEach((propPath: string) => {
    if (!propPath.includes('.')) {
      delete clonedObj[propPath];
      return;
    }

    removeNested(clonedObj, propPath.split('.'));
  });

  return Object.entries(clonedObj).reduce(
    (acc, [key, value]) => {
      if (value == null) {
        return acc;
      }

      if (typeof value === 'object' && value !== null && Object.keys(value as object).length === 0) {
        return acc;
      }

      acc[key] = value;
      return acc;
    },
    {} as Record<string, unknown>,
  );
}
