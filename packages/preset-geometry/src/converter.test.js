import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { convertPresetShapes, convertFromXmlFile } from './converter.js';

const DRAWING_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';

const SHAPE_WITH_CHILDREN = `
  <shapes xmlns="${DRAWING_NS}" xmlns:a="${DRAWING_NS}">
    <lollipop>
      <pathLst>
        <path w="100" h="100">
          <moveTo><a:pt x="0" y="0" /></moveTo>
          <lnTo><a:pt x="100" y="0" /></lnTo>
          <lnTo><a:pt x="100" y="100" /></lnTo>
          <close />
        </path>
      </pathLst>
    </lollipop>
    <ignored>
      <pathLst>
        <path stroke="false">
          <moveTo><a:pt x="0" y="0" /></moveTo>
          <lnTo><a:pt x="10" y="0" /></lnTo>
        </path>
      </pathLst>
    </ignored>
    <noStyle>
      <pathLst>
        <path fill="none" stroke="none">
          <moveTo><a:pt x="0" y="0" /></moveTo>
          <lnTo><a:pt x="10" y="0" /></lnTo>
        </path>
      </pathLst>
    </noStyle>
  </shapes>
`;

let originalDomParser;

beforeEach(() => {
  originalDomParser = globalThis.DOMParser;
  const { window } = new JSDOM('');
  globalThis.DOMParser = window.DOMParser;
});

afterEach(() => {
  if (originalDomParser) {
    globalThis.DOMParser = originalDomParser;
  } else {
    delete globalThis.DOMParser;
  }
});

describe('converter', () => {
  it('converts child shapes and filters invalid paths', () => {
    const shapes = convertPresetShapes(SHAPE_WITH_CHILDREN, { width: 200, height: 100 });
    expect(shapes).toHaveLength(1);
    const [shape] = shapes;
    expect(shape.name).toBe('lollipop');
    expect(shape.viewBox).toBe('0 0 200 100');
    expect(shape.paths).toHaveLength(1);
    expect(shape.paths[0]).toMatchObject({
      fill: 'currentColor',
      stroke: 'currentColor',
    });
  });

  it('falls back to default dimensions when undefined overrides are provided', () => {
    const shapes = convertPresetShapes(SHAPE_WITH_CHILDREN, { width: undefined, height: undefined });
    expect(shapes).toHaveLength(1);
    const [shape] = shapes;
    expect(shape.viewBox).toBe('0 0 100000 100000');
    expect(shape.paths[0].d).not.toContain('NaN');
  });

  it('delegates in convertFromXmlFile', () => {
    const results = convertFromXmlFile(SHAPE_WITH_CHILDREN, { width: 10, height: 10 });
    expect(results[0].viewBox).toBe('0 0 10 10');
  });

  it('handles documents where the root node is the shape', () => {
    const shapeXml = `
      <diamond xmlns="${DRAWING_NS}" xmlns:a="${DRAWING_NS}">
        <pathLst>
          <path>
            <moveTo><a:pt x="0" y="50" /></moveTo>
            <lnTo><a:pt x="50" y="0" /></lnTo>
            <lnTo><a:pt x="100" y="50" /></lnTo>
            <lnTo><a:pt x="50" y="100" /></lnTo>
            <close />
          </path>
        </pathLst>
      </diamond>
    `;

    const { window } = new JSDOM(shapeXml, { contentType: 'application/xml' });
    const doc = window.document;
    Object.defineProperty(doc.documentElement, 'children', {
      configurable: true,
      get() {
        return [];
      },
    });

    class MockDomParser {
      parseFromString() {
        return doc;
      }
    }

    globalThis.DOMParser = MockDomParser;
    const shapes = convertPresetShapes(shapeXml, { width: 60, height: 60 });
    expect(shapes).toHaveLength(1);
    expect(shapes[0].name).toBe('diamond');
    expect(shapes[0].viewBox).toBe('0 0 60 60');

    delete doc.documentElement.children;
  });
});
