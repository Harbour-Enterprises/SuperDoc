import { parseSizeUnit } from '../utilities/index.js';

// CSS pixels per inch; used to convert between Word's inch-based measurements and DOM pixels.
const PIXELS_PER_INCH = 96;

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
  return inchesToPixels(inches);
}

function pixelsToTwips(pixels) {
  const inches = pixelsToInches(pixels);
  return inchesToTwips(inches);
}

function inchesToPixels(inches) {
  if (inches == null) return;
  const pixels = inches * PIXELS_PER_INCH;
  return Math.round(pixels * 1000) / 1000;
}

function pixelsToInches(pixels) {
  if (pixels == null) return;
  const inches = Number(pixels) / PIXELS_PER_INCH;
  return inches;
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
  return Math.round((halfPoints * PIXELS_PER_INCH) / 72);
}

function halfPointToPoints(halfPoints) {
  if (halfPoints == null) return;
  return Math.round(halfPoints / 2);
}

function emuToPixels(emu) {
  if (emu == null) return;
  if (typeof emu === 'string') emu = parseFloat(emu);
  const pixels = (emu * PIXELS_PER_INCH) / 914400;
  return Math.round(pixels);
}

function pixelsToEmu(px) {
  if (px == null) return;
  if (typeof px === 'string') px = parseFloat(px);
  return Math.round(px * 9525);
}

function pixelsToHalfPoints(pixels) {
  if (pixels == null) return;
  return Math.round((pixels * 72) / PIXELS_PER_INCH);
}

function eighthPointsToPixels(eighthPoints) {
  if (eighthPoints == null) return;
  const points = parseFloat(eighthPoints) / 8;
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

const POLYGON_SCALE_FACTOR = 40; // Unclear why this scale factor is used or where it comes from.

function pixelsToPolygonUnits(pixels) {
  if (pixels == null) return;
  const pu = pixels * POLYGON_SCALE_FACTOR;
  // Word requires integer ST_Coordinate32 values; fractional values fail OOXML validation.
  // The previous rounding to 3 decimals produced fractional coordinates and broke anchors.
  return Math.round(pu);
}

function polygonUnitsToPixels(pu) {
  if (pu == null) return;
  const pixels = Number(pu) / POLYGON_SCALE_FACTOR;
  return Math.round(pixels * 1000) / 1000;
}

/**
 * Converts a DOCX polygon node to an array of pixel coordinates.
 * Automatically removes duplicate closing points that are the same as the starting point,
 * since polygons are assumed to be closed shapes.
 *
 * @param {Object} polygonNode - The polygon node from DOCX XML with wp:start and wp:lineTo elements
 * @returns {Array<[number, number]>|null} Array of [x, y] pixel coordinate pairs, or null if invalid input
 */
function polygonToObj(polygonNode) {
  if (!polygonNode) return null;
  const points = [];
  polygonNode.elements.forEach((element) => {
    if (['wp:start', 'wp:lineTo'].includes(element.name)) {
      const { x, y } = element.attributes;
      points.push([polygonUnitsToPixels(x), polygonUnitsToPixels(y)]);
    }
  });

  // Remove the last point if it's the same as the first point (closed polygon)
  if (points.length > 1) {
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    if (firstPoint[0] === lastPoint[0] && firstPoint[1] === lastPoint[1]) {
      points.pop();
    }
  }

  return points;
}

/**
 * Converts an array of pixel coordinates to a DOCX polygon node.
 * Automatically adds a closing wp:lineTo element that connects back to the starting point,
 * ensuring the polygon is properly closed in the DOCX format.
 *
 * @param {Array<[number, number]>} points - Array of [x, y] pixel coordinate pairs
 * @returns {Object|null} DOCX polygon node with wp:start and wp:lineTo elements, or null if invalid input
 */
function objToPolygon(points) {
  if (!points || !Array.isArray(points)) return null;
  const polygonNode = {
    name: 'wp:wrapPolygon',
    type: 'wp:wrapPolygon',
    attributes: {
      edited: '0',
    },
    elements: [],
  };
  points.forEach((point, index) => {
    const [x, y] = point;
    const tagName = index === 0 ? 'wp:start' : 'wp:lineTo';
    const pointNode = {
      name: tagName,
      type: tagName,
      attributes: {
        x: pixelsToPolygonUnits(x),
        y: pixelsToPolygonUnits(y),
      },
    };
    polygonNode.elements.push(pointNode);
  });

  // Add a lineTo back to the starting point to close the polygon
  if (points.length > 0) {
    const [startX, startY] = points[0];
    const closePointNode = {
      name: 'wp:lineTo',
      type: 'wp:lineTo',
      attributes: {
        x: pixelsToPolygonUnits(startX),
        y: pixelsToPolygonUnits(startY),
      },
    };
    polygonNode.elements.push(closePointNode);
  }

  return polygonNode;
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
  PIXELS_PER_INCH,
  inchesToTwips,
  twipsToInches,
  twipsToPixels,
  pixelsToTwips,
  pixelsToInches,
  inchesToPixels,
  twipsToLines,
  linesToTwips,
  halfPointToPixels,
  emuToPixels,
  pixelsToEmu,
  pixelsToHalfPoints,
  halfPointToPoints,
  eighthPointsToPixels,
  pixelsToEightPoints,
  rotToDegrees,
  degreesToRot,
  objToPolygon,
  polygonToObj,
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
  polygonUnitsToPixels,
  pixelsToPolygonUnits,
};
