import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { buildPathData } from './path-builder.js';
import { createBaseVariableMap } from './variables.js';

const DRAWING_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';

const pathTemplate = `
  <root xmlns:a="${DRAWING_NS}">
    <path w="50" h="50">
      <moveTo><a:pt x="0" y="0" /></moveTo>
      <lnTo><a:pt x="25" y="0" /></lnTo>
      <quadBezTo>
        <a:pt x="30" y="10" />
        <a:pt x="40" y="20" />
      </quadBezTo>
      <cubicBezTo>
        <a:pt x="45" y="25" />
        <a:pt x="48" y="30" />
        <a:pt x="50" y="40" />
      </cubicBezTo>
      <arcTo wR="10" hR="10" stAng="0" swAng="10800000" />
      <close />
    </path>
  </root>
`;

describe('path builder', () => {
  it('translates DrawingML path commands into SVG path data', () => {
    const { window } = new JSDOM(pathTemplate, { contentType: 'application/xml' });
    const pathEl = window.document.getElementsByTagName('path')[0];

    const vars = createBaseVariableMap(100, 100);
    const result = buildPathData(pathEl, vars, 100, 100);

    expect(result.d).toMatch(/M 0 0/);
    expect(result.d).toMatch(/L 50 0/); // scaled from 25 because w="50"
    expect(result.d).toMatch(/Q 60 20 80 40/); // scaled quad curve
    expect(result.d).toMatch(/C 90 50 96 60 100 80/);
    expect(result.d).toMatch(/A 20 20 0 0 1/); // arc command
    expect(result.d.trim().endsWith('Z')).toBe(true);
    expect(result.moveCount).toBe(1);
    expect(result.isClosed).toBe(true);
    expect(result.hasArc).toBe(true);
  });

  it('handles paths without width/height scaling gracefully', () => {
    const { window } = new JSDOM(
      `<root xmlns:a="${DRAWING_NS}">
        <path>
          <moveTo><a:pt x="10" y="10"/></moveTo>
          <lnTo><a:pt x="20" y="20"/></lnTo>
        </path>
      </root>`,
      { contentType: 'application/xml' },
    );

    const pathEl = window.document.getElementsByTagName('path')[0];
    const vars = createBaseVariableMap(100, 100);
    const result = buildPathData(pathEl, vars, 100, 100);
    expect(result.d).toBe('M 10 10 L 20 20');
    expect(result.hasArc).toBe(false);
  });

  it('emits an explicit move when an arc starts a subpath', () => {
    const { window } = new JSDOM(
      `<root xmlns:a="${DRAWING_NS}">
        <path w="100" h="100">
          <arcTo wR="50" hR="50" stAng="0" swAng="10800000" />
        </path>
      </root>`,
      { contentType: 'application/xml' },
    );

    const pathEl = window.document.getElementsByTagName('path')[0];
    const vars = createBaseVariableMap(200, 200);
    const result = buildPathData(pathEl, vars, 200, 200);

    expect(result.d).toMatch(/^M 200(\.\d+)? 100(\.\d+)? /);
    expect(result.d).toMatch(/A 100(\.\d+)? 100(\.\d+)? 0 0 1 0(\.\d+)? 100(\.\d+)?/);
    expect(result.moveCount).toBe(1);
    expect(result.hasArc).toBe(true);
  });
});
