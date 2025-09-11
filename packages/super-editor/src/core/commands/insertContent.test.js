import { describe, it, expect, vi, beforeEach } from 'vitest';
import { insertContent } from './insertContent.js';
import * as contentProcessor from '../helpers/contentProcessor.js';

vi.mock('../helpers/contentProcessor.js');

describe('insertContent', () => {
  let mockCommands, mockState, mockEditor, mockTr;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTr = {
      selection: { from: 0, to: 10 },
    };

    mockCommands = {
      insertContentAt: vi.fn(() => true),
    };

    mockState = {
      schema: { nodes: {} },
    };

    mockEditor = {
      schema: mockState.schema,
      migrateListsToV2: vi.fn(),
    };
  });

  it('uses original behavior when contentType is not specified', () => {
    const command = insertContent('test content', {});

    command({ tr: mockTr, state: mockState, commands: mockCommands, editor: mockEditor });

    expect(mockCommands.insertContentAt).toHaveBeenCalledWith({ from: 0, to: 10 }, 'test content', {});
    expect(contentProcessor.processContent).not.toHaveBeenCalled();
  });

  it('uses content processor when contentType is specified', async () => {
    const mockDoc = {
      toJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };

    contentProcessor.processContent.mockReturnValue(mockDoc);

    const command = insertContent('<p>HTML</p>', { contentType: 'html' });

    command({ tr: mockTr, state: mockState, commands: mockCommands, editor: mockEditor });
    await Promise.resolve(); // flush microtasks

    expect(contentProcessor.processContent).toHaveBeenCalledWith({
      content: '<p>HTML</p>',
      type: 'html',
      schema: mockState.schema,
    });

    expect(mockCommands.insertContentAt).toHaveBeenCalledWith(
      { from: 0, to: 10 },
      { type: 'doc', content: [] },
      { contentType: 'html' },
    );

    // Should trigger list migration for HTML (microtask)
    expect(mockEditor.migrateListsToV2).toHaveBeenCalledTimes(1);
  });

  it('validates contentType and returns false for invalid types', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const command = insertContent('test', { contentType: 'invalid' });
    const result = command({ tr: mockTr, state: mockState, commands: mockCommands, editor: mockEditor });

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid contentType'));
    expect(mockCommands.insertContentAt).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('handles processing errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    contentProcessor.processContent.mockImplementation(() => {
      throw new Error('Processing failed');
    });

    const command = insertContent('test', { contentType: 'html' });
    const result = command({ tr: mockTr, state: mockState, commands: mockCommands, editor: mockEditor });

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to process html'), expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('processes all valid content types', () => {
    const mockDoc = { toJSON: () => ({}) };
    contentProcessor.processContent.mockReturnValue(mockDoc);

    const validTypes = ['html', 'markdown', 'text', 'schema'];

    validTypes.forEach((type) => {
      const command = insertContent('content', { contentType: type });
      command({ tr: mockTr, state: mockState, commands: mockCommands, editor: mockEditor });

      expect(contentProcessor.processContent).toHaveBeenCalledWith(expect.objectContaining({ type }));
    });

    expect(contentProcessor.processContent).toHaveBeenCalledTimes(4);
  });

  it('calls migrateListsToV2 only for html/markdown when insert succeeds', async () => {
    const mockDoc = { toJSON: () => ({}) };
    contentProcessor.processContent.mockReturnValue(mockDoc);

    // html
    insertContent('c', { contentType: 'html' })({
      tr: mockTr,
      state: mockState,
      commands: mockCommands,
      editor: mockEditor,
    });
    // markdown
    insertContent('c', { contentType: 'markdown' })({
      tr: mockTr,
      state: mockState,
      commands: mockCommands,
      editor: mockEditor,
    });
    // text
    insertContent('c', { contentType: 'text' })({
      tr: mockTr,
      state: mockState,
      commands: mockCommands,
      editor: mockEditor,
    });
    // schema
    insertContent('c', { contentType: 'schema' })({
      tr: mockTr,
      state: mockState,
      commands: mockCommands,
      editor: mockEditor,
    });

    await Promise.resolve(); // flush microtasks
    expect(mockEditor.migrateListsToV2).toHaveBeenCalledTimes(2);
  });

  it('does not call migrateListsToV2 when insert fails', async () => {
    mockCommands.insertContentAt.mockReturnValueOnce(false);
    const mockDoc = { toJSON: () => ({}) };
    contentProcessor.processContent.mockReturnValue(mockDoc);

    insertContent('c', { contentType: 'html' })({
      tr: mockTr,
      state: mockState,
      commands: mockCommands,
      editor: mockEditor,
    });
    await Promise.resolve();
    expect(mockEditor.migrateListsToV2).not.toHaveBeenCalled();
  });
});

// Integration-style tests that use a real Editor instance to
// insert markdown/HTML lists and verify exported OOXML has list numbering.
describe('insertContent (integration) list export', () => {
  const getListParagraphs = (result) => {
    const body = result.elements?.find((el) => el.name === 'w:body');
    const paragraphs = (body?.elements || []).filter((el) => el.name === 'w:p');
    return paragraphs.filter((p) => {
      const pPr = p.elements?.find((e) => e.name === 'w:pPr');
      const numPr = pPr?.elements?.find((e) => e.name === 'w:numPr');
      return Boolean(numPr);
    });
  };

  const getNumPrVals = (p) => {
    const pPr = p.elements?.find((e) => e.name === 'w:pPr');
    const numPr = pPr?.elements?.find((e) => e.name === 'w:numPr');
    const numId = numPr?.elements?.find((e) => e.name === 'w:numId')?.attributes?.['w:val'];
    const ilvl = numPr?.elements?.find((e) => e.name === 'w:ilvl')?.attributes?.['w:val'];
    return { numId, ilvl };
  };

  const setupEditor = async () => {
    // Use real content processor for these tests
    vi.resetModules();
    vi.doUnmock('../helpers/contentProcessor.js');

    const { loadTestDataForEditorTests, initTestEditor } = await import('../../tests/helpers/helpers.js');
    const { docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests('blank-doc.docx');
    const { editor } = initTestEditor({ content: docx, media, mediaFiles, fonts, mode: 'docx' });
    return editor;
  };

  const exportFromEditorContent = async (editor) => {
    const { getExportedResultWithDocContent } = await import('../../tests/export/export-helpers/index.js');
    const content = editor.getJSON().content || [];
    return await getExportedResultWithDocContent(content);
  };

  it('exports ordered list from markdown with numId/ilvl', async () => {
    const editor = await setupEditor();
    editor.commands.insertContent('1. One\n2. Two', { contentType: 'markdown' });
    await Promise.resolve();

    const result = await exportFromEditorContent(editor);
    const listParas = getListParagraphs(result);
    expect(listParas.length).toBeGreaterThanOrEqual(2);

    const first = getNumPrVals(listParas[0]);
    expect(first.numId).toBeDefined();
    expect(first.ilvl).toBe(0);

    const second = getNumPrVals(listParas[1]);
    expect(second.numId).toBe(first.numId); // same list
    expect(second.ilvl).toBe(0);
  });

  it('exports unordered list from markdown with numId/ilvl', async () => {
    const editor = await setupEditor();
    editor.commands.insertContent('- Alpha\n- Beta', { contentType: 'markdown' });
    await Promise.resolve();

    const result = await exportFromEditorContent(editor);
    const listParas = getListParagraphs(result);
    expect(listParas.length).toBeGreaterThanOrEqual(2);

    const first = getNumPrVals(listParas[0]);
    expect(first.numId).toBeDefined();
    expect(first.ilvl).toBe(0);

    const second = getNumPrVals(listParas[1]);
    expect(second.numId).toBe(first.numId);
    expect(second.ilvl).toBe(0);
  });

  it('exports ordered list from HTML with numId/ilvl', async () => {
    const editor = await setupEditor();
    editor.commands.insertContent('<ol><li>First</li><li>Second</li></ol>', { contentType: 'html' });
    await Promise.resolve();

    const result = await exportFromEditorContent(editor);
    const listParas = getListParagraphs(result);
    expect(listParas.length).toBeGreaterThanOrEqual(2);

    const first = getNumPrVals(listParas[0]);
    expect(first.numId).toBeDefined();
    expect(first.ilvl).toBe(0);
  });

  it('exports unordered list from HTML with numId/ilvl', async () => {
    const editor = await setupEditor();
    editor.commands.insertContent('<ul><li>Apple</li><li>Banana</li></ul>', { contentType: 'html' });
    await Promise.resolve();

    const result = await exportFromEditorContent(editor);
    const listParas = getListParagraphs(result);
    expect(listParas.length).toBeGreaterThanOrEqual(2);

    const first = getNumPrVals(listParas[0]);
    expect(first.numId).toBeDefined();
    expect(first.ilvl).toBe(0);
  });
});
