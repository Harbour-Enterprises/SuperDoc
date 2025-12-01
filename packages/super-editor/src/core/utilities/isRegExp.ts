export const isRegExp = (value: unknown): value is RegExp => {
  return Object.prototype.toString.call(value) === '[object RegExp]';
};
