import { describe, it, expect, vi } from 'vitest';
import { safeCoordsAtPos } from './safe-coords-at-pos.js';

describe('safeCoordsAtPos', () => {
  it('returns null when view is missing or pos is not numeric', () => {
    expect(safeCoordsAtPos(null, 1)).toBeNull();
    expect(safeCoordsAtPos({}, '2')).toBeNull();
  });

  it('returns coords when available and null when lookup throws', () => {
    const view = { coordsAtPos: vi.fn().mockReturnValue({ top: 1, bottom: 2 }) };
    expect(safeCoordsAtPos(view, 5)).toEqual({ top: 1, bottom: 2 });

    view.coordsAtPos.mockImplementationOnce(() => {
      throw new Error('bad');
    });
    expect(safeCoordsAtPos(view, 5)).toBeNull();
  });
});
