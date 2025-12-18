import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { initTestEditor, loadTestDataForEditorTests } from '../tests/helpers/helpers.js';

describe('Editor layoutMode', () => {
  let docx;
  let media;
  let mediaFiles;
  let fonts;

  beforeAll(async () => {
    ({ docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests('blank-doc.docx'));
  });

  describe('Input Validation', () => {
    afterEach((context) => {
      context.editor?.destroy();
    });

    it('accepts valid positive numbers for all margin properties', (context) => {
      const { editor } = initTestEditor({
        content: docx,
        media,
        mediaFiles,
        fonts,
        layoutMode: 'responsive',
        layoutMargins: {
          top: 100,
          bottom: 50,
          left: 75,
          right: 25,
        },
      });
      context.editor = editor;

      expect(editor.options.layoutMargins).toEqual({
        top: 100,
        bottom: 50,
        left: 75,
        right: 25,
      });
    });

    it('accepts zero values for margin properties', (context) => {
      const { editor } = initTestEditor({
        content: docx,
        media,
        mediaFiles,
        fonts,
        layoutMode: 'responsive',
        layoutMargins: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      });
      context.editor = editor;

      expect(editor.options.layoutMargins).toEqual({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      });
    });

    it('accepts partial layoutMargins with only some properties set', (context) => {
      const { editor } = initTestEditor({
        content: docx,
        media,
        mediaFiles,
        fonts,
        layoutMode: 'responsive',
        layoutMargins: {
          top: 50,
          left: 75,
        },
      });
      context.editor = editor;

      expect(editor.options.layoutMargins).toEqual({
        top: 50,
        left: 75,
      });
    });

    it('rejects negative values and warns', (context) => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { editor } = initTestEditor({
        content: docx,
        media,
        mediaFiles,
        fonts,
        layoutMode: 'responsive',
        layoutMargins: {
          top: -10,
          bottom: 50,
        },
      });
      context.editor = editor;

      expect(editor.options.layoutMargins).toEqual({
        bottom: 50,
      });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid layoutMargins.top'));

      warnSpy.mockRestore();
    });

    it('rejects NaN values and warns', (context) => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { editor } = initTestEditor({
        content: docx,
        media,
        mediaFiles,
        fonts,
        layoutMode: 'responsive',
        layoutMargins: {
          top: NaN,
          bottom: 50,
        },
      });
      context.editor = editor;

      expect(editor.options.layoutMargins).toEqual({
        bottom: 50,
      });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid layoutMargins.top'));

      warnSpy.mockRestore();
    });

    it('rejects Infinity values and warns', (context) => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { editor } = initTestEditor({
        content: docx,
        media,
        mediaFiles,
        fonts,
        layoutMode: 'responsive',
        layoutMargins: {
          top: Infinity,
          bottom: 50,
        },
      });
      context.editor = editor;

      expect(editor.options.layoutMargins).toEqual({
        bottom: 50,
      });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid layoutMargins.top'));

      warnSpy.mockRestore();
    });

    it('rejects string values and warns', (context) => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { editor } = initTestEditor({
        content: docx,
        media,
        mediaFiles,
        fonts,
        layoutMode: 'responsive',
        layoutMargins: {
          top: '100',
          bottom: 50,
        },
      });
      context.editor = editor;

      expect(editor.options.layoutMargins).toEqual({
        bottom: 50,
      });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid layoutMargins.top'));

      warnSpy.mockRestore();
    });

    it('sets layoutMargins to null if all values are invalid', (context) => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { editor } = initTestEditor({
        content: docx,
        media,
        mediaFiles,
        fonts,
        layoutMode: 'responsive',
        layoutMargins: {
          top: -10,
          bottom: 'invalid',
          left: NaN,
          right: Infinity,
        },
      });
      context.editor = editor;

      expect(editor.options.layoutMargins).toBeNull();
      expect(warnSpy).toHaveBeenCalledTimes(4);

      warnSpy.mockRestore();
    });

    it('handles null and undefined values gracefully', (context) => {
      const { editor } = initTestEditor({
        content: docx,
        media,
        mediaFiles,
        fonts,
        layoutMode: 'responsive',
        layoutMargins: {
          top: 100,
          bottom: null,
          left: undefined,
          right: 50,
        },
      });
      context.editor = editor;

      expect(editor.options.layoutMargins).toEqual({
        top: 100,
        right: 50,
      });
    });

    it('defaults to paginated layout mode', (context) => {
      const { editor } = initTestEditor({
        content: docx,
        media,
        mediaFiles,
        fonts,
      });
      context.editor = editor;

      expect(editor.options.layoutMode).toBe('paginated');
    });

    it('accepts responsive layout mode', (context) => {
      const { editor } = initTestEditor({
        content: docx,
        media,
        mediaFiles,
        fonts,
        layoutMode: 'responsive',
      });
      context.editor = editor;

      expect(editor.options.layoutMode).toBe('responsive');
    });

    it('responsive mode takes precedence over pagination: true', (context) => {
      const { editor } = initTestEditor({
        content: docx,
        media,
        mediaFiles,
        fonts,
        layoutMode: 'responsive',
        pagination: true,
      });
      context.editor = editor;

      // layoutMode: 'responsive' should work even if pagination: true is set
      expect(editor.options.layoutMode).toBe('responsive');
      // The editor should still treat this as responsive mode
      expect(editor.options.pagination).toBe(true); // Option preserved, but behavior overridden
    });
  });

  describe('getMaxContentSize()', () => {
    let editor;

    beforeEach(() => {
      ({ editor } = initTestEditor({
        content: docx,
        media,
        mediaFiles,
        fonts,
      }));
    });

    afterEach(() => {
      if (editor) {
        editor.destroy();
        editor = null;
      }
    });

    it('returns empty object when converter is not available', () => {
      const editorWithoutConverter = { converter: null };
      const result = editor.getMaxContentSize.call(editorWithoutConverter);

      expect(result).toEqual({});
    });

    it('returns empty object when page size is not available', () => {
      editor.converter.pageStyles = {};

      const result = editor.getMaxContentSize();

      expect(result).toEqual({});
    });

    it('calculates max content size with default margins when in paginated mode', () => {
      editor.options.layoutMode = 'paginated';
      editor.options.layoutMargins = null;
      editor.converter.pageStyles = {
        pageSize: { width: 8.5, height: 11 },
        pageMargins: { top: 1, bottom: 1, left: 1, right: 1 },
      };

      const result = editor.getMaxContentSize();

      // Expected: (8.5 * 96 - 1*96 - 1*96 - 20) = (816 - 96 - 96 - 20) = 604
      // Expected: (11 * 96 - 1*96 - 1*96 - 50) = (1056 - 96 - 96 - 50) = 814
      expect(result.width).toBe(604);
      expect(result.height).toBe(814);
    });

    it('applies layoutMargins in responsive mode', () => {
      editor.options.layoutMode = 'responsive';
      editor.options.layoutMargins = {
        top: 50,
        bottom: 50,
        left: 100,
        right: 100,
      };
      editor.converter.pageStyles = {
        pageSize: { width: 8.5, height: 11 },
        pageMargins: { top: 1, bottom: 1, left: 1, right: 1 },
      };

      const result = editor.getMaxContentSize();

      // Expected: (8.5 * 96 - 100 - 100 - 20) = (816 - 200 - 20) = 596
      // Expected: (11 * 96 - 50 - 50 - 50) = (1056 - 150) = 906
      expect(result.width).toBe(596);
      expect(result.height).toBe(906);
    });

    it('uses partial layoutMargins and falls back to document margins', () => {
      editor.options.layoutMode = 'responsive';
      editor.options.layoutMargins = {
        top: 50,
        left: 100,
      };
      editor.converter.pageStyles = {
        pageSize: { width: 8.5, height: 11 },
        pageMargins: { top: 1, bottom: 1, left: 1, right: 1 },
      };

      const result = editor.getMaxContentSize();

      // Expected width: (8.5 * 96 - 100 - 1*96 - 20) = (816 - 100 - 96 - 20) = 600
      // Expected height: (11 * 96 - 50 - 1*96 - 50) = (1056 - 50 - 96 - 50) = 860
      expect(result.width).toBe(600);
      expect(result.height).toBe(860);
    });

    it('ignores layoutMargins in paginated mode', () => {
      editor.options.layoutMode = 'paginated';
      editor.options.layoutMargins = {
        top: 50,
        bottom: 50,
        left: 100,
        right: 100,
      };
      editor.converter.pageStyles = {
        pageSize: { width: 8.5, height: 11 },
        pageMargins: { top: 1, bottom: 1, left: 1, right: 1 },
      };

      const result = editor.getMaxContentSize();

      // Should use document margins, not override
      // Expected: (8.5 * 96 - 1*96 - 1*96 - 20) = 604
      // Expected: (11 * 96 - 1*96 - 1*96 - 50) = 814
      expect(result.width).toBe(604);
      expect(result.height).toBe(814);
    });

    it('handles zero values in layoutMargins', () => {
      editor.options.layoutMode = 'responsive';
      editor.options.layoutMargins = {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      };
      editor.converter.pageStyles = {
        pageSize: { width: 8.5, height: 11 },
        pageMargins: { top: 1, bottom: 1, left: 1, right: 1 },
      };

      const result = editor.getMaxContentSize();

      // Expected: (8.5 * 96 - 0 - 0 - 20) = 796
      // Expected: (11 * 96 - 0 - 0 - 50) = 1006
      expect(result.width).toBe(796);
      expect(result.height).toBe(1006);
    });

    it('handles missing page margins gracefully', () => {
      editor.options.layoutMode = 'responsive';
      editor.options.layoutMargins = {
        top: 50,
      };
      editor.converter.pageStyles = {
        pageSize: { width: 8.5, height: 11 },
        pageMargins: {},
      };

      const result = editor.getMaxContentSize();

      // In responsive mode, missing layoutMargins default to 96px (1in)
      // Expected: (8.5 * 96 - 96 - 96 - 20) = 604 (left/right default to 96px)
      // Expected: (11 * 96 - 50 - 96 - 50) = 860 (top override, bottom defaults to 96px)
      expect(result.width).toBe(604);
      expect(result.height).toBe(860);
    });
  });

  describe('updateEditorStyles()', () => {
    let editor;
    let element;
    let proseMirror;

    beforeEach(() => {
      ({ editor } = initTestEditor({
        content: docx,
        media,
        mediaFiles,
        fonts,
      }));

      // Create mock DOM elements
      element = {
        style: {},
        setAttribute: vi.fn(),
      };
      proseMirror = {
        style: {},
        setAttribute: vi.fn(),
        classList: {
          remove: vi.fn(),
        },
      };

      editor.converter.pageStyles = {
        pageSize: { width: 8.5, height: 11 },
        pageMargins: { top: 1, bottom: 1, left: 1, right: 1 },
      };
    });

    afterEach(() => {
      if (editor) {
        editor.destroy();
        editor = null;
      }
    });

    it('returns early if proseMirror is null', () => {
      editor.updateEditorStyles(element, null);

      expect(element.style.width).toBeUndefined();
    });

    it('returns early if element is null', () => {
      editor.updateEditorStyles(null, proseMirror);

      expect(proseMirror.style.paddingTop).toBeUndefined();
    });

    it('applies layoutMargins padding in responsive mode', () => {
      editor.options.layoutMode = 'responsive';
      editor.options.layoutMargins = {
        top: 50,
        bottom: 75,
        left: 100,
        right: 125,
      };

      editor.updateEditorStyles(element, proseMirror, false);

      expect(element.style.paddingLeft).toBe('100px');
      expect(element.style.paddingRight).toBe('125px');
      expect(proseMirror.style.paddingTop).toBe('50px');
      expect(proseMirror.style.paddingBottom).toBe('75px');
    });

    it('applies default padding in responsive mode without layoutMargins', () => {
      editor.options.layoutMode = 'responsive';
      editor.options.layoutMargins = null;

      editor.updateEditorStyles(element, proseMirror, false);

      // Uses default 1in (96px) for all sides in responsive mode without layoutMargins
      expect(element.style.paddingLeft).toBe('96px');
      expect(element.style.paddingRight).toBe('96px');
      expect(proseMirror.style.paddingTop).toBe('96px');
      expect(proseMirror.style.paddingBottom).toBe('96px');
    });

    it('does not apply layoutMargins in paginated mode', () => {
      editor.options.layoutMode = 'paginated';
      editor.options.pagination = true;
      editor.options.layoutMargins = {
        top: 50,
        bottom: 75,
        left: 100,
        right: 125,
      };

      editor.updateEditorStyles(element, proseMirror, true);

      // Should use document margins
      expect(element.style.paddingLeft).toBe('1in');
      expect(element.style.paddingRight).toBe('1in');
      expect(proseMirror.style.paddingTop).toBe('0');
      expect(proseMirror.style.paddingBottom).toBe('0');
    });

    it('applies partial layoutMargins with fallback to default', () => {
      editor.options.layoutMode = 'responsive';
      editor.options.layoutMargins = {
        left: 100,
        top: 50,
      };

      editor.updateEditorStyles(element, proseMirror, false);

      expect(element.style.paddingLeft).toBe('100px');
      expect(element.style.paddingRight).toBe('96px'); // Falls back to 1in = 96px
      expect(proseMirror.style.paddingTop).toBe('50px');
      expect(proseMirror.style.paddingBottom).toBe('96px'); // Falls back to 1in = 96px
    });

    it('removes minHeight in responsive mode', () => {
      editor.options.layoutMode = 'responsive';
      editor.options.layoutMargins = { top: 50 };

      editor.updateEditorStyles(element, proseMirror, false);

      expect(element.style.minHeight).toBe('');
    });

    it('sets minHeight in paginated mode', () => {
      editor.options.layoutMode = 'paginated';
      editor.options.pagination = true;
      editor.options.layoutMargins = null;

      editor.updateEditorStyles(element, proseMirror, true);

      expect(element.style.minHeight).toBe('11in');
    });

    it('sets width to 100% in responsive mode', () => {
      editor.options.layoutMode = 'responsive';

      editor.updateEditorStyles(element, proseMirror, false);

      expect(element.style.width).toBe('100%');
      expect(element.style.minWidth).toBe('');
    });

    it('sets fixed width in paginated mode', () => {
      editor.options.layoutMode = 'paginated';

      editor.updateEditorStyles(element, proseMirror, true);

      expect(element.style.width).toBe('8.5in');
      expect(element.style.minWidth).toBe('8.5in');
    });
  });
});
