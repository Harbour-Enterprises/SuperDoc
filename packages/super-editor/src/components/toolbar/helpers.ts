const sanitizeNumber = (value: string, defaultNumber: number): number => {
  // remove non-numeric characters
  const sanitized = value.replace(/[^0-9.]/g, '');
  // convert to number
  let sanitizedNum = parseFloat(sanitized);
  if (isNaN(sanitizedNum)) sanitizedNum = defaultNumber;

  return sanitizedNum;
};

interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ThrottledFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T> | undefined;
  cancel: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const throttle = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options?: ThrottleOptions,
): ThrottledFunction<T> => {
  let timeout: ReturnType<typeof setTimeout> | null;
  let args: Parameters<T> | null;
  let result: ReturnType<T> | undefined;
  let previous = 0;
  if (!options) options = {};

  const later = (): void => {
    previous = options!.leading === false ? 0 : Date.now();
    timeout = null;
    result = func(...(args as Parameters<T>));
    if (!timeout) args = null;
  };

  const throttled = (...callArgs: Parameters<T>): ReturnType<T> | undefined => {
    const _now = Date.now();
    if (!previous && options!.leading === false) previous = _now;
    const remaining = wait - (_now - previous);
    args = callArgs;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = _now;
      result = func(...callArgs);
      if (!timeout) args = null;
    } else if (!timeout && options!.trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };

  throttled.cancel = function (): void {
    if (timeout) clearTimeout(timeout);
    previous = 0;
    timeout = args = null;
  };
  return throttled;
};

export { sanitizeNumber, throttle };
