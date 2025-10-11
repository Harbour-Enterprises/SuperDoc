import { describe, it, expect } from 'vitest';
import * as exported from './index.js';
import { convertPresetShapes, convertFromXmlFile } from './converter.js';

describe('index exports', () => {
  it('re-exports converter helpers', () => {
    expect(exported.convertPresetShapes).toBe(convertPresetShapes);
    expect(exported.convertFromXmlFile).toBe(convertFromXmlFile);
  });
});
