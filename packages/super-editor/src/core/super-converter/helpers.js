import { parseSizeUnit } from '../utilities/index.js';

function inchesToTwips(inches) {
  if (inches == null) return;
  if (typeof inches === 'string') inches = parseFloat(inches);
  return Math.round(Number(inches) * 1440);
}

function twipsToInches(twips) {
  if (twips == null) return;
  const value = Number(twips);
  if (Number.isNaN(value)) return;
  return value / 1440;
}

function twipsToPixels(twips) {
  if (twips == null) return;
  const inches = twipsToInches(twips);
  if (inches == null) return;
  const pixels = inches * 96;
  return Math.round(pixels * 1000) / 1000;
}

function pixelsToTwips(pixels) {
  if (pixels == null) return;
  const inches = Number(pixels) / 96;
  return inchesToTwips(inches);
}

function twipsToLines(twips) {
  if (twips == null) return;
  return twips / 240;
}

function linesToTwips(lines) {
  if (lines == null) return;
  return lines * 240;
}

function halfPointToPixels(halfPoints) {
  if (halfPoints == null) return;
  return Math.round((halfPoints * 96) / 72);
}

function halfPointToPoints(halfPoints) {
  if (halfPoints == null) return;
  return Math.round(halfPoints / 2);
}

function emuToPixels(emu) {
  if (emu == null) return;
  if (typeof emu === 'string') emu = parseFloat(emu);
  const pixels = (emu * 96) / 914400;
  return Math.round(pixels);
}

function pixelsToEmu(px) {
  if (px == null) return;
  if (typeof px === 'string') px = parseFloat(px);
  return Math.round(px * 9525);
}

function pixelsToHalfPoints(pixels) {
  if (pixels == null) return;
  return Math.round((pixels * 72) / 96);
}

function eigthPointsToPixels(eigthPoints) {
  if (eigthPoints == null) return;
  const points = parseFloat(eigthPoints) / 8;
  const pixels = points * 1.3333;
  return pixels;
}

function pixelsToEightPoints(pixels) {
  if (pixels == null) return;
  return Math.round(pixels * 6);
}

function twipsToPt(twips) {
  if (twips == null) return;
  return twips / 20;
}

function ptToTwips(pt) {
  if (pt == null) return;
  return pt * 20;
}

function rotToDegrees(rot) {
  if (rot == null) return;
  return rot / 60000;
}

function degreesToRot(degrees) {
  if (degrees == null) return;
  return degrees * 60000;
}

/**
 * Get the export value for text indent
 * @param {string|number} indent - The text indent value to export
 * @returns {number} - The export value in twips
 */
const getTextIndentExportValue = (indent) => {
  const [value, unit] = parseSizeUnit(indent);
  const functionsMap = {
    pt: ptToTwips,
    in: inchesToTwips,
  };

  const exportValue = functionsMap[unit] ? functionsMap[unit](value) : pixelsToTwips(value);
  return exportValue;
};

const getArrayBufferFromUrl = async (input, isHeadless) => {
  // Check if it's a full URL or blob/file/data URI
  const isLikelyUrl = /^https?:|^blob:|^file:|^data:/i.test(input);

  if (isHeadless && isLikelyUrl && typeof fetch === 'function') {
    // Handle as fetchable resource
    const res = await fetch(input);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    return await res.arrayBuffer();
  }

  // Otherwise, assume it's a base64 string or Data URI
  const base64 = input.includes(',') ? input.split(',', 2)[1] : input.trim().replace(/\s/g, '');

  try {
    if (typeof globalThis.atob === 'function') {
      const binary = globalThis.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    }
  } catch (err) {
    console.warn('atob failed, falling back to Buffer:', err);
  }

  const buf = Buffer.from(base64, 'base64');
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
};

const getContentTypesFromXml = (contentTypesXml) => {
  const parser = new window.DOMParser();
  const xmlDoc = parser.parseFromString(contentTypesXml, 'text/xml');
  const defaults = xmlDoc.querySelectorAll('Default');
  return Array.from(defaults).map((item) => item.getAttribute('Extension'));
};

const DOCX_HIGHLIGHT_KEYWORD_MAP = new Map([
  ['yellow', 'FFFF00'],
  ['green', '00FF00'],
  ['blue', '0000FF'],
  ['cyan', '00FFFF'],
  ['magenta', 'FF00FF'],
  ['red', 'FF0000'],
  ['darkYellow', '808000'],
  ['darkGreen', '008000'],
  ['darkBlue', '000080'],
  ['darkCyan', '008080'],
  ['darkMagenta', '800080'],
  ['darkGray', '808080'],
  ['darkRed', '800000'],
  ['lightGray', 'C0C0C0'],
  ['black', '000000'],
  ['white', 'FFFFFF'],
]);

const normalizeHexColor = (hex) => {
  if (!hex) return null;
  let value = hex.replace('#', '').trim();
  if (!value) return null;
  value = value.toUpperCase();
  if (value.length === 3)
    value = value
      .split('')
      .map((c) => c + c)
      .join('');
  if (value.length === 8) value = value.slice(0, 6);
  return value;
};

const getHexColorFromDocxSystem = (docxColor) => {
  const hex = DOCX_HIGHLIGHT_KEYWORD_MAP.get(docxColor);
  return hex ? `#${hex}` : null;
};

const getDocxHighlightKeywordFromHex = (hexColor) => {
  if (!hexColor) return null;
  if (DOCX_HIGHLIGHT_KEYWORD_MAP.has(hexColor)) return hexColor;
  const normalized = normalizeHexColor(hexColor);
  if (!normalized) return null;
  for (const [keyword, hex] of DOCX_HIGHLIGHT_KEYWORD_MAP.entries()) {
    if (hex === normalized) return keyword;
  }
  return null;
};

function isValidHexColor(color) {
  if (!color || typeof color !== 'string') return false;

  switch (color.length) {
    case 3:
      return /^[0-9A-F]{3}$/i.test(color);
    case 6:
      return /^[0-9A-F]{6}$/i.test(color);
    case 8:
      return /^[0-9A-F]{8}$/i.test(color);
    default:
      return false;
  }
}

const componentToHex = (val) => {
  const a = Number(val).toString(16);
  return a.length === 1 ? '0' + a : a;
};

const rgbToHex = (rgb) => {
  return '#' + rgb.match(/\d+/g).map(componentToHex).join('');
};

const getLineHeightValueString = (lineHeight, defaultUnit, lineRule = '', isObject = false) => {
  let [value, unit] = parseSizeUnit(lineHeight);
  if (Number.isNaN(value) || value === 0) return {};
  if (lineRule === 'atLeast' && value < 1) return {};
  unit = unit ? unit : defaultUnit;
  return isObject ? { ['line-height']: `${value}${unit}` } : `line-height: ${value}${unit}`;
};

const deobfuscateFont = (arrayBuffer, guidHex) => {
  const dta = new Uint8Array(arrayBuffer);

  const guidStr = guidHex.replace(/[-{}]/g, '');
  if (guidStr.length !== 32) {
    console.error('Invalid GUID');
    return;
  }

  // Convert GUID hex string to byte array
  const guidBytes = new Uint8Array(16);
  for (let i = 0, j = 0; i < 32; i += 2, j++) {
    const hexByte = guidStr[i] + guidStr[i + 1];
    guidBytes[j] = parseInt(hexByte, 16);
  }

  // XOR the first 32 bytes using the reversed-index pattern
  for (let i = 0; i < 32; i++) {
    const gi = 15 - (i % 16); // guidBytes.length - (i % guidBytes.length) - 1
    dta[i] ^= guidBytes[gi];
  }

  return dta.buffer;
};

const hasSomeParentWithClass = (element, classname) => {
  if (element.className?.split(' ')?.indexOf(classname) >= 0) return true;
  return element.parentNode && hasSomeParentWithClass(element.parentNode, classname);
};

export {
  inchesToTwips,
  twipsToInches,
  twipsToPixels,
  pixelsToTwips,
  twipsToLines,
  linesToTwips,
  halfPointToPixels,
  emuToPixels,
  pixelsToEmu,
  pixelsToHalfPoints,
  halfPointToPoints,
  eigthPointsToPixels,
  pixelsToEightPoints,
  rotToDegrees,
  degreesToRot,
  getArrayBufferFromUrl,
  getContentTypesFromXml,
  getHexColorFromDocxSystem,
  getDocxHighlightKeywordFromHex,
  normalizeHexColor,
  isValidHexColor,
  rgbToHex,
  ptToTwips,
  twipsToPt,
  getLineHeightValueString,
  deobfuscateFont,
  hasSomeParentWithClass,
  getTextIndentExportValue,
};
