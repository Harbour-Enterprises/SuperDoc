import { describe, it, expect } from 'vitest';
import { polygonToObj, objToPolygon, emuToPixels, pixelsToEmu } from './helpers.js';

describe('polygonToObj', () => {
  it('should return null for null input', () => {
    expect(polygonToObj(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(polygonToObj(undefined)).toBeNull();
  });

  it('should return empty array for polygon with no elements', () => {
    const polygon = { elements: [] };
    expect(polygonToObj(polygon)).toEqual([]);
  });

  it('should extract points from wp:start and wp:lineTo elements', () => {
    const polygon = {
      elements: [
        { name: 'wp:start', attributes: { x: '914400', y: '914400' } }, // 1 pixel each
        { name: 'wp:lineTo', attributes: { x: '1828800', y: '1828800' } }, // 2 pixels each
        { name: 'wp:lineTo', attributes: { x: '2743200', y: '2743200' } }, // 3 pixels each
      ],
    };

    const result = polygonToObj(polygon);
    expect(result).toEqual([
      [96, 96], // rounded from emuToPixels conversion
      [192, 192],
      [288, 288],
    ]);
  });

  it('should ignore elements that are not wp:start or wp:lineTo', () => {
    const polygon = {
      elements: [
        { name: 'wp:start', attributes: { x: '914400', y: '914400' } },
        { name: 'wp:other', attributes: { x: '1828800', y: '1828800' } }, // should be ignored
        { name: 'wp:lineTo', attributes: { x: '2743200', y: '2743200' } },
      ],
    };

    const result = polygonToObj(polygon);
    expect(result).toEqual([
      [96, 96],
      [288, 288],
    ]);
  });

  it('should remove the last point if it matches the first point (closed polygon)', () => {
    const polygon = {
      elements: [
        { name: 'wp:start', attributes: { x: '914400', y: '914400' } }, // [100, 100]
        { name: 'wp:lineTo', attributes: { x: '1828800', y: '1828800' } }, // [200, 200]
        { name: 'wp:lineTo', attributes: { x: '2743200', y: '2743200' } }, // [300, 300]
        { name: 'wp:lineTo', attributes: { x: '914400', y: '914400' } }, // [100, 100] - duplicate
      ],
    };

    const result = polygonToObj(polygon);
    expect(result).toEqual([
      [96, 96],
      [192, 192],
      [288, 288],
    ]);
  });

  it('should not remove the last point if it does not match the first point', () => {
    const polygon = {
      elements: [
        { name: 'wp:start', attributes: { x: '914400', y: '914400' } }, // [100, 100]
        { name: 'wp:lineTo', attributes: { x: '1828800', y: '1828800' } }, // [200, 200]
        { name: 'wp:lineTo', attributes: { x: '2743200', y: '2743200' } }, // [300, 300]
        { name: 'wp:lineTo', attributes: { x: '3657600', y: '3657600' } }, // [400, 400] - different
      ],
    };

    const result = polygonToObj(polygon);
    expect(result).toEqual([
      [96, 96],
      [192, 192],
      [288, 288],
      [384, 384],
    ]);
  });

  it('should handle single point polygon', () => {
    const polygon = {
      elements: [{ name: 'wp:start', attributes: { x: '914400', y: '914400' } }],
    };

    const result = polygonToObj(polygon);
    expect(result).toEqual([[96, 96]]);
  });
});

describe('objToPolygon', () => {
  it('should return null for null input', () => {
    expect(objToPolygon(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(objToPolygon(undefined)).toBeNull();
  });

  it('should return null for non-array input', () => {
    expect(objToPolygon('not an array')).toBeNull();
    expect(objToPolygon({})).toBeNull();
    expect(objToPolygon(123)).toBeNull();
  });

  it('should handle empty array', () => {
    const result = objToPolygon([]);
    expect(result).toEqual({
      type: 'wp:wrapPolygon',
      elements: [],
    });
  });

  it('should convert points to polygon with wp:start for first point and wp:lineTo for others', () => {
    const points = [
      [100, 100],
      [200, 200],
      [300, 300],
    ];

    const result = objToPolygon(points);
    expect(result).toEqual({
      type: 'wp:wrapPolygon',
      elements: [
        {
          type: 'wp:start',
          attributes: { x: 952500, y: 952500 }, // pixelsToEmu(100)
        },
        {
          type: 'wp:lineTo',
          attributes: { x: 1905000, y: 1905000 }, // pixelsToEmu(200)
        },
        {
          type: 'wp:lineTo',
          attributes: { x: 2857500, y: 2857500 }, // pixelsToEmu(300)
        },
        {
          type: 'wp:lineTo',
          attributes: { x: 952500, y: 952500 }, // back to start point
        },
      ],
    });
  });

  it('should add lineTo back to starting point to close the polygon', () => {
    const points = [
      [50, 75],
      [150, 175],
    ];

    const result = objToPolygon(points);

    // Check that the last element is a lineTo back to the starting point
    const elements = result.elements;
    const firstPoint = elements[0];
    const lastPoint = elements[elements.length - 1];

    expect(firstPoint.type).toBe('wp:start');
    expect(lastPoint.type).toBe('wp:lineTo');
    expect(lastPoint.attributes.x).toBe(firstPoint.attributes.x);
    expect(lastPoint.attributes.y).toBe(firstPoint.attributes.y);
  });

  it('should handle single point array', () => {
    const points = [[100, 200]];

    const result = objToPolygon(points);
    expect(result).toEqual({
      type: 'wp:wrapPolygon',
      elements: [
        {
          type: 'wp:start',
          attributes: { x: 952500, y: 1905000 },
        },
        {
          type: 'wp:lineTo',
          attributes: { x: 952500, y: 1905000 }, // back to start
        },
      ],
    });
  });

  it('should handle floating point coordinates', () => {
    const points = [
      [100.5, 200.7],
      [300.2, 400.9],
    ];

    const result = objToPolygon(points);
    expect(result.elements[0].attributes.x).toBe(pixelsToEmu(100.5));
    expect(result.elements[0].attributes.y).toBe(pixelsToEmu(200.7));
    expect(result.elements[1].attributes.x).toBe(pixelsToEmu(300.2));
    expect(result.elements[1].attributes.y).toBe(pixelsToEmu(400.9));
  });
});

describe('polygonToObj and objToPolygon integration', () => {
  it('should be able to convert back and forth while maintaining polygon closure', () => {
    // Start with a polygon that has a closing point
    const originalPolygon = {
      elements: [
        { name: 'wp:start', attributes: { x: '914400', y: '914400' } },
        { name: 'wp:lineTo', attributes: { x: '1828800', y: '1828800' } },
        { name: 'wp:lineTo', attributes: { x: '2743200', y: '2743200' } },
        { name: 'wp:lineTo', attributes: { x: '914400', y: '914400' } }, // closing point
      ],
    };

    // Convert to object (should remove duplicate closing point)
    const points = polygonToObj(originalPolygon);
    expect(points).toEqual([
      [96, 96],
      [192, 192],
      [288, 288],
    ]);

    // Convert back to polygon (should add closing point)
    const newPolygon = objToPolygon(points);
    expect(newPolygon.elements).toHaveLength(4); // 3 original + 1 closing

    // First and last points should be the same
    const firstElement = newPolygon.elements[0];
    const lastElement = newPolygon.elements[3];
    expect(firstElement.type).toBe('wp:start');
    expect(lastElement.type).toBe('wp:lineTo');
    expect(lastElement.attributes.x).toBe(firstElement.attributes.x);
    expect(lastElement.attributes.y).toBe(firstElement.attributes.y);
  });

  it('should handle open polygons correctly', () => {
    // Start with an open polygon
    const originalPolygon = {
      elements: [
        { name: 'wp:start', attributes: { x: '914400', y: '914400' } },
        { name: 'wp:lineTo', attributes: { x: '1828800', y: '1828800' } },
        { name: 'wp:lineTo', attributes: { x: '2743200', y: '2743200' } },
      ],
    };

    // Convert to object
    const points = polygonToObj(originalPolygon);
    expect(points).toEqual([
      [96, 96],
      [192, 192],
      [288, 288],
    ]);

    // Convert back to polygon (should add closing point)
    const newPolygon = objToPolygon(points);
    expect(newPolygon.elements).toHaveLength(4); // 3 original + 1 closing
  });

  it('should handle realistic DOCX polygon roundtrip scenario', () => {
    // Simulate a typical DOCX polygon that comes from Word - closed polygon with duplicate end point
    const docxPolygon = {
      elements: [
        { name: 'wp:start', attributes: { x: '914400', y: '914400' } }, // Top-left: [96, 96]
        { name: 'wp:lineTo', attributes: { x: '2743200', y: '914400' } }, // Top-right: [288, 96]
        { name: 'wp:lineTo', attributes: { x: '2743200', y: '2743200' } }, // Bottom-right: [288, 288]
        { name: 'wp:lineTo', attributes: { x: '914400', y: '2743200' } }, // Bottom-left: [96, 288]
        { name: 'wp:lineTo', attributes: { x: '914400', y: '914400' } }, // Back to start (duplicate)
      ],
    };

    // Step 1: Import from DOCX (should remove duplicate closing point)
    const importedPoints = polygonToObj(docxPolygon);
    expect(importedPoints).toEqual([
      [96, 96], // Top-left
      [288, 96], // Top-right
      [288, 288], // Bottom-right
      [96, 288], // Bottom-left (no duplicate)
    ]);

    // Step 2: Export back to DOCX (should add closing point)
    const exportedPolygon = objToPolygon(importedPoints);
    expect(exportedPolygon.elements).toHaveLength(5); // 4 original + 1 closing

    // Verify structure
    expect(exportedPolygon.elements[0].type).toBe('wp:start');
    expect(exportedPolygon.elements[1].type).toBe('wp:lineTo');
    expect(exportedPolygon.elements[2].type).toBe('wp:lineTo');
    expect(exportedPolygon.elements[3].type).toBe('wp:lineTo');
    expect(exportedPolygon.elements[4].type).toBe('wp:lineTo'); // Closing point

    // Verify closing point matches starting point
    const startPoint = exportedPolygon.elements[0];
    const closingPoint = exportedPolygon.elements[4];
    expect(closingPoint.attributes.x).toBe(startPoint.attributes.x);
    expect(closingPoint.attributes.y).toBe(startPoint.attributes.y);
  });
});
