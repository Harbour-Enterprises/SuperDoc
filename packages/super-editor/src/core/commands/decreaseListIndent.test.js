// @ts-check
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findParentNode } from '../helpers/index.js';
import { decreaseListIndent } from './decreaseListIndent.js';
import * as changeListLevelModule from './changeListLevel.js';

vi.mock('../helpers/list-numbering-helpers.js', () => {
  return {
    ListHelpers: {
      hasListDefinition: vi.fn().mockReturnValue(true),
    },
  };
});

vi.mock('../helpers/index.js', () => {
  return {
    findParentNode: vi.fn().mockReturnValue(vi.fn().mockReturnValue(null)),
  };
});

describe('decreaseListIndent', () => {
  /** @type {{ state: any }, converter: { convertedXml: any, numbering: { definitions: any, abstracts: any } }} */
  let editor;
  /** @type {{ setNodeMarkup: ReturnType<typeof vi.fn> }} */
  let tr;

  beforeEach(() => {
    vi.clearAllMocks();
    editor = {
      state: { selection: {} },
      converter: { convertedXml: {}, numbering: { definitions: {}, abstracts: {} } },
    };
    tr = { setNodeMarkup: vi.fn() };
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('returns false when no current list item is found', () => {
    findParentNode.mockReturnValue(vi.fn().mockReturnValue(null));
    const result = decreaseListIndent()({ editor, tr });
    expect(result).toBe(false);
    expect(tr.setNodeMarkup).not.toHaveBeenCalled();
  });

  it('no-ops (returns true) at level 0 and does not mutate the doc', () => {
    const currentItem = {
      node: { type: { name: 'listItem' }, attrs: { numberingProperties: { ilvl: 0, numId: 1 } } },
      pos: 5,
    };

    findParentNode.mockReturnValue(vi.fn().mockReturnValue(currentItem));

    const result = decreaseListIndent()({ editor, tr });
    expect(result).toBe(true);
    expect(tr.setNodeMarkup).not.toHaveBeenCalled();
  });

  it('decreases level by 1', () => {
    const currentItem = {
      node: { type: { name: 'listItem' }, attrs: { numberingProperties: { ilvl: 2, numId: 123 } } },
      pos: 42,
    };

    findParentNode.mockReturnValue(vi.fn().mockReturnValue(currentItem));

    const result = decreaseListIndent()({ editor, tr });

    expect(result).toBe(true);
    expect(tr.setNodeMarkup).toHaveBeenCalledTimes(1);
    expect(tr.setNodeMarkup).toHaveBeenCalledWith(42, null, {
      indent: null,
      listRendering: null,
      numberingProperties: {
        ilvl: 1,
        numId: 123,
      },
      paragraphProperties: {
        numberingProperties: {
          ilvl: 1,
          numId: 123,
        },
      },
      spacing: null,
      styleId: null,
    });
  });

  it('dispatches the transaction when changeListLevel succeeds', () => {
    const dispatch = vi.fn();
    const changeListSpy = vi.spyOn(changeListLevelModule, 'changeListLevel').mockReturnValue(true);

    const result = decreaseListIndent()({ editor, tr, dispatch });

    expect(result).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(tr);

    changeListSpy.mockRestore();
  });

  it('does not dispatch when changeListLevel fails', () => {
    const dispatch = vi.fn();
    const changeListSpy = vi.spyOn(changeListLevelModule, 'changeListLevel').mockReturnValue(false);

    const result = decreaseListIndent()({ editor, tr, dispatch });

    expect(result).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();

    changeListSpy.mockRestore();
  });
});
