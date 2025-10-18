import { describe, it, expect } from 'vitest';
import * as helpers from './index.js';
import { clamp } from './clamp.js';
import { safeCoordsAtPos } from './safe-coords-at-pos.js';
import { findBreakPosInTable } from './find-break-pos-in-table.js';

describe('helpers index re-exports', () => {
  it('exposes key helper functions', () => {
    expect(helpers.clamp).toBe(clamp);
    expect(helpers.safeCoordsAtPos).toBe(safeCoordsAtPos);
    expect(typeof helpers.findBreakPosInTable).toBe('function');
    expect(helpers.findBreakPosInTable).toBe(findBreakPosInTable);
  });
});
