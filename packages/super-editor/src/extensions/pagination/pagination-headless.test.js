/**
 * Pagination Headless Mode Tests
 *
 * Test suite verifying pagination functionality is properly disabled in headless mode
 * while maintaining full document functionality.
 */

import { describe, it, expect, vi } from 'vitest';
import { Editor } from '@core/Editor.js';
import { getStarterExtensions } from '@extensions/index.js';
import { PageNumber } from '@extensions/page-number/page-number.js';
import { Pagination } from './pagination.js';
import { isHeadless } from '@/utils/headless-helpers.js';
import { initTestEditor, loadTestDataForEditorTests } from '@tests/helpers/helpers.js';
import { PaginationPluginKey } from './pagination-helpers.js';

describe('Pagination Headless Mode', () => {
  describe('Pagination extension registration', () => {
    it('should not register commands, shortcuts, or plugins in headless mode', () => {
      const editor = { options: { isHeadless: true } };

      const commands = Pagination.config.addCommands.call({ editor });
      const shortcuts = Pagination.config.addShortcuts.call({ editor });
      const plugins = Pagination.config.addPmPlugins.call({ editor });

      expect(commands).toEqual({});
      expect(shortcuts).toEqual({});
      expect(plugins).toEqual([]);
    });

    it('should register commands, shortcuts, and plugins in non-headless mode', () => {
      const editor = {
        options: { isHeadless: false, pagination: true },
        commands: { insertPageBreak: vi.fn() },
        view: { state: { tr: { setMeta: vi.fn() } } },
      };

      const commands = Pagination.config.addCommands.call({ editor });
      const shortcuts = Pagination.config.addShortcuts.call({ editor });
      const plugins = Pagination.config.addPmPlugins.call({ editor });

      expect(commands).toHaveProperty('insertPageBreak');
      expect(commands).toHaveProperty('togglePagination');
      expect(shortcuts).toHaveProperty('Mod-Enter');
      expect(plugins.length).toBeGreaterThan(0);
    });
  });

  describe('PageNumber pagination updates', () => {
    it('should not trigger pagination update in headless mode, but should in non-headless mode', () => {
      const commands = PageNumber.config.addCommands();
      const pageNode = { type: 'page-number' };
      const schema = {
        nodes: { 'page-number': {} },
        nodeFromJSON: vi.fn().mockReturnValue(pageNode),
      };

      // Test headless mode
      const setMetaHeadless = vi.fn();
      commands.addAutoPageNumber()({
        editor: { options: { isHeaderOrFooter: true, isHeadless: true } },
        tr: { replaceSelectionWith: vi.fn(), setMeta: setMetaHeadless },
        dispatch: vi.fn(),
        state: { schema },
      });
      expect(setMetaHeadless).not.toHaveBeenCalledWith('forceUpdatePagination', true);

      // Test non-headless mode
      const setMetaNonHeadless = vi.fn();
      commands.addAutoPageNumber()({
        editor: { options: { isHeaderOrFooter: true, isHeadless: false } },
        tr: { replaceSelectionWith: vi.fn(), setMeta: setMetaNonHeadless },
        dispatch: vi.fn(),
        state: { schema },
      });
      expect(setMetaNonHeadless).toHaveBeenCalledWith('forceUpdatePagination', true);
    });
  });

  describe('Editor pagination initialization', () => {
    it('should skip pagination plugin initialization in headless mode', async () => {
      const { editor } = initTestEditor({
        isHeadless: true,
        pagination: true,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const paginationPlugins = editor.view.state.plugins.filter((plugin) => plugin.key === PaginationPluginKey);
      expect(paginationPlugins.length).toBe(0);
    });

    it('should initialize pagination plugin in non-headless mode', async () => {
      const { editor } = initTestEditor({
        isHeadless: false,
        pagination: true,
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      const paginationPlugins = editor.view.state.plugins.filter((plugin) => plugin.key === PaginationPluginKey);
      expect(paginationPlugins.length).toBeGreaterThan(0);
    });
  });

  describe('Integration: Full editor lifecycle', () => {
    it('should maintain document functionality in headless mode without pagination overhead', async () => {
      const { docx, mediaFiles, fonts } = await loadTestDataForEditorTests('blank-doc.docx');

      const editor = new Editor({
        isHeadless: true,
        mode: 'docx',
        documentId: 'headless-pagination-test',
        extensions: getStarterExtensions(),
        content: docx,
        mediaFiles,
        fonts,
        pagination: true, // Even with pagination enabled, it should be skipped
      });

      // Verify document loads
      const json = editor.getJSON();
      expect(json.type).toBe('doc');

      // Verify pagination plugin is not active (key optimization)
      const paginationPlugins = editor.view.state.plugins.filter((plugin) => plugin.key === PaginationPluginKey);
      expect(paginationPlugins.length).toBe(0);

      // Verify core functionality still works
      expect(editor.commands.insertContent).toBeDefined();
      editor.commands.insertContent({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Test content' }],
      });
      expect(editor.state.doc.textContent).toContain('Test content');

      // Verify export still works
      const exported = await editor.exportDocx();
      expect(Buffer.isBuffer(exported)).toBe(true);
      expect(exported.length).toBeGreaterThan(0);

      editor.destroy();
    });

    it('should enable pagination in non-headless mode', async () => {
      const { docx, mediaFiles, fonts } = await loadTestDataForEditorTests('blank-doc.docx');

      const editor = new Editor({
        isHeadless: false,
        mode: 'docx',
        documentId: 'non-headless-pagination-test',
        extensions: getStarterExtensions(),
        content: docx,
        mediaFiles,
        fonts,
        pagination: true,
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify pagination plugin is active
      const paginationPlugins = editor.view.state.plugins.filter((plugin) => plugin.key === PaginationPluginKey);
      expect(paginationPlugins.length).toBeGreaterThan(0);

      // Verify pagination commands are available
      expect(editor.commands.insertPageBreak).toBeDefined();
      expect(editor.commands.togglePagination).toBeDefined();

      editor.destroy();
    });
  });
});
