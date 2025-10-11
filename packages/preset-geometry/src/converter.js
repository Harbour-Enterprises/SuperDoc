import { ensureDomParser, stripBom } from './dom.js';
import { DRAWINGML_NS } from './constants.js';
import { createBaseVariableMap, evaluateGuides, resolveToken } from './variables.js';
import { resolveFill, resolveStroke } from './colors.js';
import { buildPathData } from './path-builder.js';

const DEFAULT_DIMENSION = 100000;

const DEFAULT_OPTIONS = {
  width: DEFAULT_DIMENSION,
  height: DEFAULT_DIMENSION,
};

/**
 * Determines whether the provided element contains DrawingML path definitions.
 *
 * @param {Element} node Candidate element from the preset definition document.
 * @returns {boolean} True when the element contains at least one `<path>` descendant.
 */
const hasPaths = (node) => node.getElementsByTagNameNS(DRAWINGML_NS, 'path').length > 0;

/**
 * Resolves the list of elements that should be interpreted as shapes.
 *
 * @param {Element} root Root node of the preset definition XML document.
 * @returns {Element[]} Elements that should be converted to shapes.
 */
function getShapeCandidates(root) {
  const elementChildren = Array.from(root.children).filter((node) => node.nodeType === 1);
  const hasChildShapes = elementChildren.some(hasPaths);
  const rootHasPaths = hasPaths(root);
  const isShapeRoot = rootHasPaths && !hasChildShapes;
  return isShapeRoot ? [root] : elementChildren;
}

/**
 * Derives style attributes for an SVG path from a DrawingML path element.
 *
 * @param {Element} pathEl The source path element (`a:path`).
 * @param {Record<string, number>} vars Variable dictionary populated for the shape.
 * @param {{isClosed: boolean, moveCount: number}} pathData Metadata describing the path.
 * @param {string} shapeName Name of the current shape, used to special-case arcs.
 * @returns {{fill: string, stroke: string, strokeWidth?: number, fillRule?: string, clipRule?: string}|null}
 *   Style information, or null when the path would not produce a visible stroke/fill.
 */
function buildStyleAttributes(pathEl, vars, pathData, shapeName) {
  const fillAttr = pathEl.getAttribute('fill');
  const strokeAttr = pathEl.getAttribute('stroke');
  const strokeAttrNormalized = strokeAttr != null ? String(strokeAttr).toLowerCase() : null;
  const strokeWidthAttr = pathEl.getAttribute('strokeWidth');
  const hasFillAttr = pathEl.hasAttribute('fill');
  const hasStrokeAttr = pathEl.hasAttribute('stroke');

  let stroke = resolveStroke(strokeAttr);
  let fill = hasFillAttr ? resolveFill(fillAttr) : undefined;

  if (!hasFillAttr) {
    if (!pathData.isClosed) {
      fill = 'none';
    } else if (hasStrokeAttr && (stroke === 'none' || stroke == null)) {
      fill = strokeAttrNormalized === 'false' ? (shapeName === 'arc' ? 'none' : 'currentColor') : 'none';
    } else {
      fill = 'currentColor';
    }
  }

  if (!hasStrokeAttr && (fill === 'currentColor' || fill === 'none')) {
    stroke = resolveStroke(null);
  }

  let strokeWidth;
  if (strokeWidthAttr) {
    strokeWidth = resolveToken(strokeWidthAttr, vars);
  }

  if ((fill === 'none' || fill == null) && (stroke === 'none' || stroke == null)) {
    return null;
  }

  let fillRule;
  const explicitFillRule = pathEl.getAttribute('fillRule') || pathEl.getAttribute('fill-rule');
  if (explicitFillRule) {
    fillRule = explicitFillRule;
  } else if (fill !== 'none' && pathData.moveCount > 1) {
    fillRule = 'evenodd';
  }

  return {
    fill,
    stroke,
    strokeWidth,
    fillRule,
    clipRule: fillRule,
  };
}

/**
 * Converts a DrawingML shape element into the intermediate SVG representation.
 *
 * @param {Element} element Shape element (e.g., `<arc>`, `<triangle>`).
 * @param {number} width Target viewport width.
 * @param {number} height Target viewport height.
 * @returns {{name: string, viewBox: string, paths: Array<{d: string, fill: string, stroke: string, strokeWidth?: number, fillRule?: string, clipRule?: string}>}|null}
 *   The converted shape or null when no visible paths remain.
 */
function convertShapeElement(element, width, height) {
  const vars = createBaseVariableMap(width, height);
  evaluateGuides(element, vars);

  const pathList = element.getElementsByTagNameNS(DRAWINGML_NS, 'pathLst')[0];
  if (!pathList) return null;

  const paths = [];
  for (const pathEl of pathList.getElementsByTagNameNS(DRAWINGML_NS, 'path')) {
    const pathData = buildPathData(pathEl, vars, width, height);
    if (!pathData || !pathData.d) continue;

    const style = buildStyleAttributes(pathEl, vars, pathData, element.localName);
    if (!style) continue;

    paths.push({
      d: pathData.d,
      ...style,
    });
  }

  if (!paths.length) {
    return null;
  }

  return {
    name: element.localName,
    viewBox: `0 0 ${width} ${height}`,
    paths,
  };
}

/**
 * Converts the preset shape XML document into renderable shape descriptors.
 *
 * @param {string} xmlSource Raw XML source containing preset shape definitions.
 * @param {{width?: number, height?: number}} [options] Optional conversion options.
 * @returns {Array<{name: string, viewBox: string, paths: Array<{d: string, fill: string, stroke: string, strokeWidth?: number, fillRule?: string, clipRule?: string}>}>}
 *   Collection of converted shapes.
 */
export function convertPresetShapes(xmlSource, options = {}) {
  const width = options.width ?? DEFAULT_OPTIONS.width;
  const height = options.height ?? DEFAULT_OPTIONS.height;
  const parser = ensureDomParser();
  const xml = stripBom(xmlSource);
  const doc = parser.parseFromString(xml, 'application/xml');
  const root = doc.documentElement;

  const shapes = [];
  for (const element of getShapeCandidates(root)) {
    if (element.nodeType !== 1) continue;

    const shape = convertShapeElement(element, width, height);
    if (shape) {
      shapes.push(shape);
    }
  }

  return shapes;
}

/**
 * Convenience wrapper that forwards directly to {@link convertPresetShapes}.
 *
 * @param {string} xmlSource Raw XML source.
 * @param {{width?: number, height?: number}} [options] Optional conversion options.
 * @returns {ReturnType<typeof convertPresetShapes>} Converted shapes.
 */
export function convertFromXmlFile(xmlSource, options) {
  return convertPresetShapes(xmlSource, options);
}
