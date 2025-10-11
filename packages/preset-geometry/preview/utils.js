const SVG_NS = 'http://www.w3.org/2000/svg';

const measureSvg = document.createElementNS(SVG_NS, 'svg');
measureSvg.setAttribute('width', '0');
measureSvg.setAttribute('height', '0');
measureSvg.style.position = 'absolute';
measureSvg.style.visibility = 'hidden';
document.body.appendChild(measureSvg);

export function measurePaths(pathElements) {
  const group = document.createElementNS(SVG_NS, 'g');
  pathElements.forEach((el) => group.appendChild(el.cloneNode(true)));
  measureSvg.appendChild(group);
  const bbox = group.getBBox();
  measureSvg.removeChild(group);
  const width = bbox.width || 1;
  const height = bbox.height || 1;
  return {
    minX: bbox.x,
    minY: bbox.y,
    width,
    height,
  };
}

export function createPathElement(path) {
  const element = document.createElementNS(SVG_NS, 'path');
  element.setAttribute('d', path.d);
  const fill = path.fill && path.fill !== 'none' ? path.fill : 'none';
  element.setAttribute('fill', fill);
  const stroke = path.stroke === 'none' ? 'none' : path.stroke || 'currentColor';
  element.setAttribute('stroke', stroke);
  if (path.fillRule) {
    element.setAttribute('fill-rule', path.fillRule);
  }
  if (path.clipRule) {
    element.setAttribute('clip-rule', path.clipRule);
  }
  if (stroke !== 'none') {
    const width = path.strokeWidth != null ? String(path.strokeWidth) : '2';
    element.setAttribute('stroke-width', width);
    element.setAttribute('vector-effect', 'non-scaling-stroke');
    element.setAttribute('stroke-linejoin', 'round');
    element.setAttribute('stroke-linecap', 'round');
  } else {
    element.setAttribute('stroke-width', '0');
  }
  return element;
}

export async function loadShapeNames(xml) {
  const dom = new window.DOMParser().parseFromString(xml, 'application/xml');
  const names = [];
  for (const node of dom.documentElement.children) {
    if (node.nodeType === 1) {
      names.push(node.localName);
    }
  }
  return names;
}
