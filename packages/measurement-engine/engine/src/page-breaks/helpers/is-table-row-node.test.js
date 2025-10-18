import { describe, it, expect } from 'vitest';
import { isTableRowNode } from './is-table-row-node.js';

describe('isTableRowNode', () => {
  it('detects nodes with row name or role', () => {
    expect(isTableRowNode({ type: { name: 'tableRow' } })).toBe(true);
    expect(isTableRowNode({ type: { spec: { tableRole: 'row' } } })).toBe(true);
    expect(isTableRowNode({})).toBe(false);
  });
});
