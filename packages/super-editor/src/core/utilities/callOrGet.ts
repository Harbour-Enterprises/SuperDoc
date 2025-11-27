export type MaybeGetter<T> = T | ((...args: unknown[]) => T);

export const callOrGet = <T>(value: MaybeGetter<T>, context?: unknown, ...args: unknown[]): T => {
  if (typeof value === 'function') {
    const fn = value as (...args: unknown[]) => T;
    return context ? fn.apply(context, args) : fn(...args);
  }
  return value as T;
};
