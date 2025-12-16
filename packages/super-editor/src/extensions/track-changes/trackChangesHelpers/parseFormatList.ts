type FormatEntry = { type: string; attrs: Record<string, unknown> };

/**
 * Parse format list from string.
 * @param {string} str
 * @returns {Object[]} Array ({ type, attrs })
 */
export const parseFormatList = (str: string | null | undefined): FormatEntry[] => {
  if (!str) return [];
  let formatList: unknown;
  try {
    formatList = JSON.parse(str);
  } catch {
    return [];
  }
  if (!Array.isArray(formatList)) {
    return [];
  }
  return (formatList as unknown[])
    .filter(
      (format): format is FormatEntry =>
        typeof format === 'object' &&
        !!format &&
        Object.prototype.hasOwnProperty.call(format, 'type') &&
        Object.prototype.hasOwnProperty.call(format, 'attrs'),
    )
    .map((format) => format);
};
