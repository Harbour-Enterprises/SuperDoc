import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanUpListsWithAnnotations } from './cleanUpListsWithAnnotations.js';
import * as fieldHelpers from '../fieldAnnotationHelpers/index.js';
import * as coreHelpers from '@core/helpers/index.js';

vi.mock('../fieldAnnotationHelpers/index.js', async () => {
  const actual = await vi.importActual('../fieldAnnotationHelpers/index.js');
  return {
    ...actual,
    getAllFieldAnnotations: vi.fn(),
  };
});

vi.mock('@core/helpers/index.js', async () => {
  const actual = await vi.importActual('@core/helpers/index.js');
  return {
    ...actual,
    findParentNodeClosestToPos: vi.fn(),
  };
});

describe('cleanUpListsWithAnnotations', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const createListItemNode = (hasOtherContent = false) => ({
    type: { name: 'listItem' },
    nodeSize: 6,
    descendants(callback) {
      callback({ type: { name: 'fieldAnnotation' } }, 0);
    },
    children: [
      {
        type: { name: 'paragraph' },
        children: hasOtherContent
          ? [
              { type: { name: 'text' }, attrs: {} },
              { type: { name: 'fieldAnnotation' }, attrs: { fieldId: 'field-1' } },
            ]
          : [{ type: { name: 'fieldAnnotation' }, attrs: { fieldId: 'field-1' } }],
      },
    ],
  });

  it('deletes list items that only contain removed annotations', () => {
    fieldHelpers.getAllFieldAnnotations.mockReturnValue([{ node: { attrs: { fieldId: 'field-1' } }, pos: 10 }]);

    coreHelpers.findParentNodeClosestToPos.mockReturnValue({
      pos: 20,
      depth: 0,
      node: createListItemNode(false),
    });

    const tr = { delete: vi.fn(), setMeta: vi.fn() };
    const state = { doc: { resolve: vi.fn(() => ({})) } };

    const result = cleanUpListsWithAnnotations(['field-1'])({ dispatch: vi.fn(), tr, state });

    expect(result).toBe(true);
    expect(tr.delete).toHaveBeenCalledWith(20, 26);
    expect(tr.setMeta).toHaveBeenCalledWith('updateListSync', true);
  });

  it('keeps list items that still have other annotations or content', () => {
    fieldHelpers.getAllFieldAnnotations.mockReturnValue([{ node: { attrs: { fieldId: 'field-1' } }, pos: 10 }]);

    coreHelpers.findParentNodeClosestToPos.mockReturnValue({
      pos: 30,
      depth: 0,
      node: createListItemNode(true),
    });

    const tr = { delete: vi.fn(), setMeta: vi.fn() };
    const state = { doc: { resolve: vi.fn(() => ({})) } };

    const result = cleanUpListsWithAnnotations(['field-1'])({ dispatch: vi.fn(), tr, state });

    expect(result).toBe(true);
    expect(tr.delete).not.toHaveBeenCalled();
    expect(tr.setMeta).not.toHaveBeenCalled();
  });
});
