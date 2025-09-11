import { describe, it, expect } from 'vitest';
import { isRunPropertiesNode } from './is-run-properties-node.js';

describe('isRunPropertiesNode', () => {
  it('returns true for w:rPr node', () => {
    expect(isRunPropertiesNode({ name: 'w:rPr' })).toBe(true);
  });

  it('returns false for other node names', () => {
    expect(isRunPropertiesNode({ name: 'w:pPr' })).toBe(false);
    expect(isRunPropertiesNode({ name: 'w:r' })).toBe(false);
  });

  it('returns false for null/undefined inputs', () => {
    expect(isRunPropertiesNode(undefined)).toBe(false);
    expect(isRunPropertiesNode(null)).toBe(false);
    expect(isRunPropertiesNode({})).toBe(false);
  });
});
