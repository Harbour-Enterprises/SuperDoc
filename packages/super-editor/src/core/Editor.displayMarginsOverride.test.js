import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { initTestEditor, loadTestDataForEditorTests } from '../tests/helpers/helpers.js';

describe('Editor displayMarginsOverride', () => {
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
        pagination: false,
        displayMarginsOverride: {
          top: 100,
          bottom: 50,
          left: 75,
          right: 25,
        },
      });
      context.editor = editor;

      expect(editor.options.displayMarginsOverride).toEqual({
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
        pagination: false,
        displayMarginsOverride: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      });
      context.editor = editor;

      expect(editor.options.displayMarginsOverride).toEqual({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      });
    });

    it('accepts partial displayMarginsOverride with only some properties set', (context) => {
      const { editor } = initTestEditor({
        content: docx,
        media,
        mediaFiles,
        fonts,
        pagination: false,
        displayMarginsOverride: {
          top: 50,
          left: 75,
        },
      });
      context.editor = editor;

      expect(editor.options.displayMarginsOverride).toEqual({
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
        pagination: false,
        displayMarginsOverride: {
          top: -10,
          bottom: 50,
        },
      });
      context.editor = editor;

      expect(editor.options.displayMarginsOverride).toEqual({
        bottom: 50,
      });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid displayMarginsOverride.top'));

      warnSpy.mockRestore();
    });

    it('rejects NaN values and warns', (context) => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { editor } = initTestEditor({
        content: docx,
        media,
        mediaFiles,
        fonts,
        pagination: false,
        displayMarginsOverride: {
          top: NaN,
          bottom: 50,
        },
      });
      context.editor = editor;

      expect(editor.options.displayMarginsOverride).toEqual({
        bottom: 50,
      });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid displayMarginsOverride.top'));

      warnSpy.mockRestore();
    });

    it('rejects Infinity values and warns', (context) => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { editor } = initTestEditor({
        content: docx,
        media,
        mediaFiles,
        fonts,
        pagination: false,
        displayMarginsOverride: {
          top: Infinity,
          bottom: 50,
        },
      });
      context.editor = editor;

      expect(editor.options.displayMarginsOverride).toEqual({
        bottom: 50,
      });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid displayMarginsOverride.top'));

      warnSpy.mockRestore();
    });

    it('rejects string values and warns', (context) => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { editor } = initTestEditor({
        content: docx,
        media,
        mediaFiles,
        fonts,
        pagination: false,
        displayMarginsOverride: {
          top: '100',
          bottom: 50,
        },
      });
      context.editor = editor;

      expect(editor.options.displayMarginsOverride).toEqual({
        bottom: 50,
      });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid displayMarginsOverride.top'));

      warnSpy.mockRestore();
    });

    it('sets displayMarginsOverride to null if all values are invalid', (context) => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { editor } = initTestEditor({
        content: docx,
        media,
        mediaFiles,
        fonts,
        pagination: false,
        displayMarginsOverride: {
          top: -10,
          bottom: 'invalid',
          left: NaN,
          right: Infinity,
        },
      });
      context.editor = editor;

      expect(editor.options.displayMarginsOverride).toBeNull();
      expect(warnSpy).toHaveBeenCalledTimes(4);

      warnSpy.mockRestore();
    });

    it('handles null and undefined values gracefully', (context) => {
      const { editor } = initTestEditor({
        content: docx,
        media,
        mediaFiles,
        fonts,
        pagination: false,
        displayMarginsOverride: {
          top: 100,
          bottom: null,
          left: undefined,
          right: 50,
        },
      });
      context.editor = editor;

      expect(editor.options.displayMarginsOverride).toEqual({
        top: 100,
        right: 50,
      });
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

    it('calculates max content size with default margins when pagination is enabled', () => {
      editor.options.pagination = true;
      editor.options.displayMarginsOverride = null;
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

    it('applies displayMarginsOverride when pagination is disabled', () => {
      editor.options.pagination = false;
      editor.options.displayMarginsOverride = {
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

    it('uses partial displayMarginsOverride and falls back to document margins', () => {
      editor.options.pagination = false;
      editor.options.displayMarginsOverride = {
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

    it('ignores displayMarginsOverride when pagination is enabled', () => {
      editor.options.pagination = true;
      editor.options.displayMarginsOverride = {
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

    it('handles zero values in displayMarginsOverride', () => {
      editor.options.pagination = false;
      editor.options.displayMarginsOverride = {
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
      editor.options.pagination = false;
      editor.options.displayMarginsOverride = {
        top: 50,
      };
      editor.converter.pageStyles = {
        pageSize: { width: 8.5, height: 11 },
        pageMargins: {},
      };

      const result = editor.getMaxContentSize();

      // Expected: (8.5 * 96 - 0 - 0 - 20) = 796 (left/right use 0 when margins missing)
      // Expected: (11 * 96 - 50 - 0 - 50) = 956 (top override, bottom uses 0)
      expect(result.width).toBe(796);
      expect(result.height).toBe(956);
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

    it('applies displayMarginsOverride padding when pagination is disabled', () => {
      editor.options.pagination = false;
      editor.options.displayMarginsOverride = {
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

    it('applies default padding when pagination is disabled without override', () => {
      editor.options.pagination = false;
      editor.options.displayMarginsOverride = null;

      editor.updateEditorStyles(element, proseMirror, false);

      expect(element.style.paddingLeft).toBe('1in');
      expect(element.style.paddingRight).toBe('1in');
      expect(proseMirror.style.paddingTop).toBe('1in');
      expect(proseMirror.style.paddingBottom).toBe('1in');
    });

    it('does not apply displayMarginsOverride when pagination is enabled', () => {
      editor.options.pagination = true;
      editor.options.displayMarginsOverride = {
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

    it('applies partial displayMarginsOverride with fallback to document margins', () => {
      editor.options.pagination = false;
      editor.options.displayMarginsOverride = {
        left: 100,
        top: 50,
      };

      editor.updateEditorStyles(element, proseMirror, false);

      expect(element.style.paddingLeft).toBe('100px');
      expect(element.style.paddingRight).toBeUndefined(); // Not set by override, uses document margin
      expect(proseMirror.style.paddingTop).toBe('50px');
      expect(proseMirror.style.paddingBottom).toBe('96px'); // Falls back to 1in = 96px
    });

    it('removes minHeight when displayMarginsOverride is active', () => {
      editor.options.pagination = false;
      editor.options.displayMarginsOverride = { top: 50 };

      editor.updateEditorStyles(element, proseMirror, false);

      expect(element.style.minHeight).toBe('');
    });

    it('sets minHeight when displayMarginsOverride is not active', () => {
      editor.options.pagination = true;
      editor.options.displayMarginsOverride = null;

      editor.updateEditorStyles(element, proseMirror, true);

      expect(element.style.minHeight).toBe('11in');
    });
  });
});
