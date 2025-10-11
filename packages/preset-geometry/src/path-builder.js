import { DRAWINGML_NS, FULL_CIRCLE, HALF_CIRCLE } from './constants.js';
import { angleToRadians, isNumericToken } from './math.js';
import { resolveToken } from './variables.js';

/**
 * Converts a DrawingML point element into a scaled coordinate.
 *
 * @param {Element} ptEl Point element (`a:pt`) extracted from the DOM.
 * @param {Record<string, number>} vars Variable dictionary.
 * @param {number} scaleX Horizontal scaling factor.
 * @param {number} scaleY Vertical scaling factor.
 * @returns {{x: number, y: number}} The computed coordinate.
 */
function readPoint(ptEl, vars, scaleX, scaleY) {
  const rawX = ptEl.getAttribute('x');
  const rawY = ptEl.getAttribute('y');
  let x = resolveToken(rawX, vars);
  let y = resolveToken(rawY, vars);
  if (scaleX && isNumericToken(rawX)) {
    x *= scaleX;
  }
  if (scaleY && isNumericToken(rawY)) {
    y *= scaleY;
  }
  return { x, y };
}

/**
 * Builds an SVG arc command from a DrawingML arc segment.
 *
 * @param {{x: number, y: number}|null} currentPoint Previously plotted coordinate.
 * @param {Element} arcEl The `arcTo` element describing the arc.
 * @param {Record<string, number>} vars Variable dictionary.
 * @param {number} scaleX Horizontal scaling factor.
 * @param {number} scaleY Vertical scaling factor.
 * @returns {{command: string, endPoint: {x: number, y: number}}} SVG command and resulting point.
 */
function buildArcSegment(currentPoint, arcEl, vars, scaleX, scaleY) {
  const rawWR = arcEl.getAttribute('wR');
  const rawHR = arcEl.getAttribute('hR');
  let wR = Math.abs(resolveToken(rawWR, vars));
  let hR = Math.abs(resolveToken(rawHR, vars));
  if (scaleX && isNumericToken(rawWR)) {
    wR *= scaleX;
  }
  if (scaleY && isNumericToken(rawHR)) {
    hR *= scaleY;
  }

  const stAngRaw = resolveToken(arcEl.getAttribute('stAng'), vars);
  const swAngRaw = resolveToken(arcEl.getAttribute('swAng'), vars);
  const stAng = ((stAngRaw % FULL_CIRCLE) + FULL_CIRCLE) % FULL_CIRCLE;
  let swAng = swAngRaw;
  if (swAng <= -FULL_CIRCLE) swAng = -FULL_CIRCLE;
  if (swAng >= FULL_CIRCLE) swAng = FULL_CIRCLE;

  const startRad = angleToRadians(stAng);

  let startX;
  let startY;
  let centerX;
  let centerY;

  if (currentPoint) {
    startX = currentPoint.x;
    startY = currentPoint.y;
    centerX = startX - wR * Math.cos(startRad);
    centerY = startY - hR * Math.sin(startRad);
  } else {
    centerX = vars.hc || 0;
    centerY = vars.vc || 0;
    startX = centerX + wR * Math.cos(startRad);
    startY = centerY + hR * Math.sin(startRad);
  }

  const segmentCount = Math.max(1, Math.ceil(Math.abs(swAng) / HALF_CIRCLE));
  const segmentAngle = swAng / segmentCount;

  const commands = [];
  let currentAngle = stAng;
  let lastX = startX;
  let lastY = startY;

  for (let i = 0; i < segmentCount; i += 1) {
    const endAngle = currentAngle + segmentAngle;
    const endRad = angleToRadians(endAngle);
    const endX = centerX + wR * Math.cos(endRad);
    const endY = centerY + hR * Math.sin(endRad);
    const largeArcFlag = Math.abs(segmentAngle) > HALF_CIRCLE ? 1 : 0;
    const sweepFlag = segmentAngle >= 0 ? 1 : 0;
    commands.push(`A ${wR} ${hR} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`);
    currentAngle = endAngle;
    lastX = endX;
    lastY = endY;
  }

  return { command: commands.join(' '), startPoint: { x: startX, y: startY }, endPoint: { x: lastX, y: lastY } };
}

/**
 * Calculates a safe scaling factor for DrawingML path dimensions.
 *
 * @param {string|null} pathDimension Dimension attribute from the path element.
 * @param {number} targetDimension Desired viewport dimension.
 * @returns {number} Scale multiplier.
 */
function calculateScale(pathDimension, targetDimension) {
  if (pathDimension == null) {
    return 1;
  }
  const numeric = Number(pathDimension);
  if (!Number.isFinite(numeric) || numeric === 0) {
    return 1;
  }
  return targetDimension / numeric;
}

/**
 * Translates DrawingML path commands into an SVG path description.
 *
 * @param {Element} pathEl Path element from the shape definition.
 * @param {Record<string, number>} vars Variable dictionary.
 * @param {number} width Target viewport width.
 * @param {number} height Target viewport height.
 * @returns {{d: string, moveCount: number, isClosed: boolean, hasArc: boolean}} Path metadata.
 */
export function buildPathData(pathEl, vars, width, height) {
  const segments = [];
  let currentPoint = null;
  let moveCount = 0;
  let isClosed = false;
  let hasArc = false;
  const scaleX = calculateScale(pathEl.getAttribute('w'), width);
  const scaleY = calculateScale(pathEl.getAttribute('h'), height);
  for (const child of pathEl.children) {
    switch (child.localName) {
      case 'moveTo': {
        const pt = readPoint(child.getElementsByTagNameNS(DRAWINGML_NS, 'pt')[0], vars, scaleX, scaleY);
        segments.push(`M ${pt.x} ${pt.y}`);
        currentPoint = pt;
        moveCount += 1;
        break;
      }
      case 'lnTo': {
        const pt = readPoint(child.getElementsByTagNameNS(DRAWINGML_NS, 'pt')[0], vars, scaleX, scaleY);
        segments.push(`L ${pt.x} ${pt.y}`);
        currentPoint = pt;
        break;
      }
      case 'quadBezTo': {
        const pts = child.getElementsByTagNameNS(DRAWINGML_NS, 'pt');
        if (pts.length === 2) {
          const c = readPoint(pts[0], vars, scaleX, scaleY);
          const pt = readPoint(pts[1], vars, scaleX, scaleY);
          segments.push(`Q ${c.x} ${c.y} ${pt.x} ${pt.y}`);
          currentPoint = pt;
        }
        break;
      }
      case 'cubicBezTo': {
        const pts = child.getElementsByTagNameNS(DRAWINGML_NS, 'pt');
        if (pts.length === 3) {
          const c1 = readPoint(pts[0], vars, scaleX, scaleY);
          const c2 = readPoint(pts[1], vars, scaleX, scaleY);
          const pt = readPoint(pts[2], vars, scaleX, scaleY);
          segments.push(`C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${pt.x} ${pt.y}`);
          currentPoint = pt;
        }
        break;
      }
      case 'arcTo': {
        const { command, startPoint, endPoint } = buildArcSegment(currentPoint, child, vars, scaleX, scaleY);
        if (!currentPoint && startPoint) {
          segments.push(`M ${startPoint.x} ${startPoint.y}`);
          moveCount += 1;
        }
        segments.push(command);
        currentPoint = endPoint;
        hasArc = true;
        break;
      }
      case 'close':
        segments.push('Z');
        currentPoint = null;
        isClosed = true;
        break;
      default:
        break;
    }
  }
  return {
    d: segments.join(' '),
    moveCount,
    isClosed,
    hasArc,
  };
}
