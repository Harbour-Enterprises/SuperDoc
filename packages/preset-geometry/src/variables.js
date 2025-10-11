import { DRAWINGML_NS, FULL_CIRCLE } from './constants.js';
import { sanitizeNumber, angleToRadians, radiansToAngleUnits, hypot2 } from './math.js';

/**
 * Creates the initial variable map used by Adjust value calculations.
 *
 * @param {number} width Target viewport width in DrawingML units.
 * @param {number} height Target viewport height in DrawingML units.
 * @returns {Record<string, number>} Variable dictionary populated with base values.
 */
export function createBaseVariableMap(width, height) {
  const vars = Object.create(null);
  const w = width;
  const h = height;
  vars.w = w;
  vars.h = h;
  vars.l = 0;
  vars.t = 0;
  vars.r = w;
  vars.b = h;
  vars.hc = w / 2;
  vars.vc = h / 2;
  vars.ss = Math.min(w, h);
  const divisors = [2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 36, 40, 48, 64, 72, 96];
  divisors.forEach((div) => {
    vars[`wd${div}`] = w / div;
    vars[`hd${div}`] = h / div;
  });
  return vars;
}

/**
 * Resolves a DrawingML token into a numeric value using the variable map.
 *
 * @param {string|number|null|undefined} token Token from the shape definition.
 * @param {Record<string, number>} vars Variable dictionary.
 * @returns {number} Numeric value represented by the token.
 */
export function resolveToken(token, vars) {
  if (token == null || token === '') return 0;
  if (typeof token === 'number') return token;
  if (/^-?\d+(\.\d+)?$/.test(token)) {
    return Number(token);
  }
  if (/^-?[0-9]*cd[0-9]+$/.test(token)) {
    const parts = token.split('cd');
    const multiplier = parts[0] === '' || parts[0] === '-' ? Number(`${parts[0]}1`) : Number(parts[0]);
    const divisor = Number(parts[1]);
    if (!divisor) return 0;
    return (FULL_CIRCLE / divisor) * multiplier;
  }
  const value = vars[token];
  if (typeof value === 'number') {
    return value;
  }
  return 0;
}

/**
 * Evaluates a DrawingML guide formula within the context of variables.
 *
 * @param {string} formula DrawingML formula string.
 * @param {Record<string, number>} vars Variable dictionary.
 * @returns {number} Computed result for the formula.
 */
export function evaluateFormula(formula, vars) {
  const tokens = formula.trim().split(/\s+/);
  const op = tokens[0];
  const args = tokens.slice(1).map((token) => resolveToken(token, vars));
  switch (op) {
    case 'val':
      return sanitizeNumber(args[0]);
    case '+-':
      return sanitizeNumber(args[0] + args[1] - args[2]);
    case '*/':
      return args[2] === 0 ? 0 : sanitizeNumber((args[0] * args[1]) / args[2]);
    case '+/':
      return args[2] === 0 ? 0 : sanitizeNumber((args[0] + args[1]) / args[2]);
    case 'abs':
      return Math.abs(args[0]);
    case 'max':
      return Math.max(args[0], args[1]);
    case 'min':
      return Math.min(args[0], args[1]);
    case 'pin':
      return Math.min(Math.max(args[0], args[1]), args[2]);
    case 'mod': {
      // DrawingML's "mod" operator calculates the vector modulus (length), not remainder.
      return sanitizeNumber(Math.hypot(...args));
    }
    case 'sin': {
      const radius = args[0];
      const radians = angleToRadians(args[1]);
      return sanitizeNumber(radius * Math.sin(radians));
    }
    case 'cos': {
      const radius = args[0];
      const radians = angleToRadians(args[1]);
      return sanitizeNumber(radius * Math.cos(radians));
    }
    case 'atan2':
      return sanitizeNumber(Math.atan2(args[1], args[0]));
    case 'tan': {
      const radius = args[0];
      const radians = angleToRadians(args[1]);
      return sanitizeNumber(radius * Math.tan(radians));
    }
    case 'at2': {
      const radians = Math.atan2(args[1], args[0]);
      return radiansToAngleUnits(radians);
    }
    case 'sat2': {
      const radius = args[0];
      const x = args[1];
      const y = args[2];
      const mag = hypot2(x, y);
      if (mag === 0) return 0;
      return sanitizeNumber((radius * y) / mag);
    }
    case 'cat2': {
      const radius = args[0];
      const x = args[1];
      const y = args[2];
      const mag = hypot2(x, y);
      if (mag === 0) return sanitizeNumber(radius);
      return sanitizeNumber((radius * x) / mag);
    }
    case '?:': {
      return args[0] >= 0 ? args[1] : args[2];
    }
    case 'sqrt':
      return args[0] < 0 ? 0 : Math.sqrt(args[0]);
    default:
      console.warn(`Unsupported formula operator "${op}"`);
      return 0;
  }
}

/**
 * Populates the variable map using adjustment and guide nodes from a shape element.
 *
 * @param {Element} shapeEl Shape definition element that may contain guides.
 * @param {Record<string, number>} vars Variable dictionary to mutate.
 * @returns {void}
 */
export function evaluateGuides(shapeEl, vars) {
  const avList = shapeEl.getElementsByTagNameNS(DRAWINGML_NS, 'avLst')[0];
  if (avList) {
    const adjustments = avList.getElementsByTagNameNS(DRAWINGML_NS, 'gd');
    for (const adj of adjustments) {
      const name = adj.getAttribute('name');
      const formula = adj.getAttribute('fmla');
      if (!name || !formula) continue;
      vars[name] = evaluateFormula(formula, vars);
    }
  }
  const gdList = shapeEl.getElementsByTagNameNS(DRAWINGML_NS, 'gdLst')[0];
  if (gdList) {
    const guides = gdList.getElementsByTagNameNS(DRAWINGML_NS, 'gd');
    for (const guide of guides) {
      const name = guide.getAttribute('name');
      const formula = guide.getAttribute('fmla');
      if (!name || !formula) continue;
      vars[name] = evaluateFormula(formula, vars);
    }
  }
}
