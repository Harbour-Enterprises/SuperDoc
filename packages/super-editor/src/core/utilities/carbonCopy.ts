export const carbonCopy = <T>(obj: T): T | undefined => {
  if (!obj) return undefined;
  try {
    return JSON.parse(JSON.stringify(obj)) as T;
  } catch (e) {
    console.error('Error in carbonCopy', obj, e);
    return undefined;
  }
};
