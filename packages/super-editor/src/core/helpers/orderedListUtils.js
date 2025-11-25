export const generateOrderedListIndex = ({ listLevel, lvlText, listNumberingType, customFormat }) => {
  const handler = listIndexMap[listNumberingType];
  return handler ? handler(listLevel, lvlText, customFormat) : null;
};

const handleDecimal = (path, lvlText) => generateNumbering(path, lvlText, String);
const handleRoman = (path, lvlText) => generateNumbering(path, lvlText, intToRoman);
const handleLowerRoman = (path, lvlText) => handleRoman(path, lvlText).toLowerCase();
const handleLowerAlpha = (path, lvlText) => handleAlpha(path, lvlText).toLowerCase();
const handleAlpha = (path, lvlText) => generateNumbering(path, lvlText, (p) => intToAlpha(p));
const handleOrdinal = (path, lvlText) => generateNumbering(path, lvlText, ordinalFormatter);
const handleCustom = (path, lvlText, customFormat) => generateFromCustom(path, lvlText, customFormat);
const handleJapaneseCounting = (path, lvlText) => generateNumbering(path, lvlText, intToJapaneseCounting);

const listIndexMap = {
  decimal: handleDecimal,
  lowerRoman: handleLowerRoman,
  upperRoman: handleRoman,
  lowerLetter: handleLowerAlpha,
  upperLetter: handleAlpha,
  ordinal: handleOrdinal,
  custom: handleCustom,

  japaneseCounting: handleJapaneseCounting,
};

const createNumbering = (values, lvlText) => {
  return values.reduce((acc, value, index) => {
    return value > 9 ? acc.replace(/^0/, '').replace(`%${index + 1}`, value) : acc.replace(`%${index + 1}`, value);
  }, lvlText);
};

const generateNumbering = (path, lvlText, formatter) => {
  const formattedValues = path.map(formatter);
  return createNumbering(formattedValues, lvlText);
};

const ordinalFormatter = (level) => {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const value = level % 100;
  const suffix = suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0];
  const p = level + suffix;
  return p;
};

const generateFromCustom = (path, lvlText, customFormat) => {
  if (customFormat !== '001, 002, 003, ...') return generateNumbering(path, lvlText, String);

  const match = customFormat.match(/(\d+)/);
  if (!match) throw new Error('Invalid format string: no numeric pattern found');

  const sample = match[1];
  const digitCount = sample.length;
  const index = path.pop();
  return String(index).padStart(digitCount, '0');
};

/**
 * Convert a number to a roman numeral
 * @param {number} num
 * @returns {string}
 */
const intToRoman = (num) => {
  const romanNumeralMap = [
    { value: 1000, numeral: 'M' },
    { value: 900, numeral: 'CM' },
    { value: 500, numeral: 'D' },
    { value: 400, numeral: 'CD' },
    { value: 100, numeral: 'C' },
    { value: 90, numeral: 'XC' },
    { value: 50, numeral: 'L' },
    { value: 40, numeral: 'XL' },
    { value: 10, numeral: 'X' },
    { value: 9, numeral: 'IX' },
    { value: 5, numeral: 'V' },
    { value: 4, numeral: 'IV' },
    { value: 1, numeral: 'I' },
  ];

  let result = '';
  for (const { value, numeral } of romanNumeralMap) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
};

/**
 * Convert a number to an alphabetic character
 * @param {number} num
 * @returns {string}
 */
const intToAlpha = (num) => {
  let result = '';
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  while (num > 0) {
    let index = (num - 1) % 26;
    result = alphabet[index] + result;
    num = Math.floor((num - 1) / 26);
  }
  return result;
};

/**
 * @param {number} num
 * @returns {string}
 */
export const intToJapaneseCounting = (num) => {
  const digits = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const units = ['', '十', '百', '千'];

  if (num === 0) return '零';
  if (num < 10) return digits[num];

  let result = '';
  let tempNum = num;
  let unitIndex = 0;

  while (tempNum > 0) {
    const digit = tempNum % 10;
    if (digit !== 0) {
      const digitStr = digit === 1 && unitIndex > 0 ? '' : digits[digit];
      result = digitStr + (unitIndex > 0 ? units[unitIndex] : '') + result;
    } else if (result && tempNum > 0) {
      // Add zero only if there are more significant digits and we already have a result
      if (!result.startsWith('零') && tempNum % 100 !== 0) {
        result = '零' + result;
      }
    }

    tempNum = Math.floor(tempNum / 10);
    unitIndex++;

    if (unitIndex > 3) break; // Support up to thousands
  }

  // Handle special cases for 10-19
  if (num >= 10 && num < 20) {
    result = result.replace(/^一十/, '十');
  }

  return result;
};
