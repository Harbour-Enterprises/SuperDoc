import { describe, it, expect } from 'vitest';
import { isTableCellNode } from './is-table-cell-node.js';

describe('isTableCellNode', () => {
  it('detects nodes with cell name or role', () => {
    expect(isTableCellNode({ type: { name: 'tableCell' } })).toBe(true);
    expect(isTableCellNode({ type: { name: 'table_header' } })).toBe(true);
    expect(isTableCellNode({ type: { spec: { tableRole: 'cell' } } })).toBe(true);
    expect(isTableCellNode({})).toBe(false);
  });
});
