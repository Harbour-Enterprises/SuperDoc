import { describe, it, expect } from 'vitest';
import { isTableNode } from './is-table-node.js';

describe('isTableNode', () => {
  it('detects nodes with table name or role', () => {
    expect(isTableNode({ type: { name: 'table' } })).toBe(true);
    expect(isTableNode({ type: { spec: { tableRole: 'table' } } })).toBe(true);
    expect(isTableNode({})).toBe(false);
  });
});
