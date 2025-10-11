import { convertPresetShapes } from '../src/converter.js';
import { measurePaths, createPathElement, loadShapeNames } from './utils.js';
import { loadPresetDefinitions } from './xml-loader.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function renderShape(container, shape) {
  const card = document.createElement('article');
  card.className = 'shape-card';

  const title = document.createElement('h2');
  title.textContent = shape.name;
  card.appendChild(title);

  const pathElements = shape.paths.map((path) => createPathElement(path));
  const bounds = measurePaths(pathElements);
  const margin = Math.max(bounds.width, bounds.height) * 0.05;
  const viewBox = [bounds.minX - margin, bounds.minY - margin, bounds.width + margin * 2, bounds.height + margin * 2];

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', viewBox.join(' '));
  svg.setAttribute('width', '200');
  svg.setAttribute('height', '200');

  pathElements.forEach((pathElement) => {
    svg.appendChild(pathElement);
  });

  card.appendChild(svg);
  container.appendChild(card);
}

async function loadDefinitionsXml() {
  return loadPresetDefinitions();
}

async function loadShapes() {
  const status = document.getElementById('status');
  const container = document.getElementById('test');
  status.textContent = 'Loading presetShapeDefinitions.xml…';
  try {
    const xml = await loadDefinitionsXml();
    status.textContent = 'Converting…';

    const shapeNames = await loadShapeNames(xml);
    const shapes = convertPresetShapes(xml, { width: 200, height: 200 });
    const shapeMap = new Map(shapes.map((shape) => [shape.name, shape]));

    container.textContent = '';
    const missing = [];

    shapeNames.forEach((name) => {
      const shape = shapeMap.get(name);
      if (shape) {
        renderShape(container, shape);
      } else {
        missing.push(name);
      }
    });

    status.textContent = missing.length
      ? `Done (missing: ${missing.join(', ')})`
      : `Done (${shapeNames.length} shapes)`;
  } catch (error) {
    console.error(error);
    container.className = 'error';
    container.textContent = `Error: ${error.message}`;
    status.textContent = 'Error';
  }
}

window.addEventListener('DOMContentLoaded', loadShapes);
