import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SuperToolbar } from '../../components/toolbar/super-toolbar.js';

// Mock the dependencies
vi.mock('@core/helpers/getActiveFormatting.js', () => ({
  getActiveFormatting: vi.fn(),
}));

vi.mock('@helpers/isInTable.js', () => ({
  isInTable: vi.fn().mockImplementation(() => false),
}));

vi.mock('@extensions/linked-styles/linked-styles.js', () => ({
  getQuickFormatList: vi.fn(),
}));

vi.mock('@extensions/track-changes/permission-helpers.js', () => ({
  collectTrackedChanges: vi.fn(() => []),
  isTrackedChangeActionAllowed: vi.fn(() => true),
}));

describe('updateToolbarState', () => {
  let toolbar;
  let mockEditor;
  let mockGetActiveFormatting;
  let mockIsInTable;
  let mockGetQuickFormatList;
  let mockCollectTrackedChanges;
  let mockIsTrackedChangeActionAllowed;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockEditor = {
      state: {
        selection: { from: 1, to: 1 },
      },
      commands: {
        setFieldAnnotationsFontSize: vi.fn(),
        setFieldAnnotationsFontFamily: vi.fn(),
        setFieldAnnotationsTextColor: vi.fn(),
        setFieldAnnotationsTextHighlight: vi.fn(),
        setCellBackground: vi.fn(),
        toggleFieldAnnotationsFormat: vi.fn(),
      },
      converter: {
        getDocumentDefaultStyles: vi.fn(() => ({ typeface: 'Arial', fontSizePt: 12 })),
        linkedStyles: [],
        docHiglightColors: new Set(['#ff0000', '#00ff00']),
      },
      options: {
        mode: 'docx',
        isHeaderOrFooter: false,
      },
      focus: vi.fn(),
      on: vi.fn(),
    };

    mockGetActiveFormatting = vi.fn();
    mockIsInTable = vi.fn();
    mockGetQuickFormatList = vi.fn().mockReturnValue([]);

    const { getActiveFormatting } = await import('@core/helpers/getActiveFormatting.js');
    const { isInTable } = await import('@helpers/isInTable.js');
    const { getQuickFormatList } = await import('@extensions/linked-styles/linked-styles.js');
    const { collectTrackedChanges, isTrackedChangeActionAllowed } = await import(
      '@extensions/track-changes/permission-helpers.js'
    );

    getActiveFormatting.mockImplementation(mockGetActiveFormatting);
    isInTable.mockImplementation(mockIsInTable);
    getQuickFormatList.mockImplementation(mockGetQuickFormatList);
    mockCollectTrackedChanges = collectTrackedChanges;
    mockIsTrackedChangeActionAllowed = isTrackedChangeActionAllowed;

    mockCollectTrackedChanges.mockReturnValue([]);
    mockIsTrackedChangeActionAllowed.mockReturnValue(true);

    toolbar = new SuperToolbar({
      selector: '#test-toolbar',
      editor: mockEditor,
      role: 'editor',
    });

    toolbar.toolbarItems = [
      {
        name: { value: 'bold' },
        resetDisabled: vi.fn(),
        activate: vi.fn(),
        deactivate: vi.fn(),
        setDisabled: vi.fn(),
        allowWithoutEditor: { value: false },
      },
      {
        name: { value: 'italic' },
        resetDisabled: vi.fn(),
        activate: vi.fn(),
        deactivate: vi.fn(),
        setDisabled: vi.fn(),
        allowWithoutEditor: { value: false },
      },
      {
        name: { value: 'underline' },
        resetDisabled: vi.fn(),
        activate: vi.fn(),
        deactivate: vi.fn(),
        setDisabled: vi.fn(),
        allowWithoutEditor: { value: false },
      },
      {
        name: { value: 'linkedStyles' },
        resetDisabled: vi.fn(),
        activate: vi.fn(),
        deactivate: vi.fn(),
        setDisabled: vi.fn(),
        allowWithoutEditor: { value: false },
      },
      {
        name: { value: 'tableActions' },
        resetDisabled: vi.fn(),
        activate: vi.fn(),
        deactivate: vi.fn(),
        setDisabled: vi.fn(),
        disabled: { value: false },
        allowWithoutEditor: { value: false },
      },
      {
        name: { value: 'fontSize' },
        resetDisabled: vi.fn(),
        activate: vi.fn(),
        deactivate: vi.fn(),
        setDisabled: vi.fn(),
        defaultLabel: { value: '' },
        allowWithoutEditor: { value: false },
      },
      {
        name: { value: 'fontFamily' },
        resetDisabled: vi.fn(),
        activate: vi.fn(),
        deactivate: vi.fn(),
        setDisabled: vi.fn(),
        defaultLabel: { value: '' },
        allowWithoutEditor: { value: false },
      },
      {
        name: { value: 'lineHeight' },
        resetDisabled: vi.fn(),
        activate: vi.fn(),
        deactivate: vi.fn(),
        setDisabled: vi.fn(),
        selectedValue: { value: '' },
        allowWithoutEditor: { value: false },
      },
      {
        name: { value: 'highlight' },
        resetDisabled: vi.fn(),
        activate: vi.fn(),
        deactivate: vi.fn(),
        setDisabled: vi.fn(),
        nestedOptions: { value: [] },
        allowWithoutEditor: { value: false },
      },
      {
        name: { value: 'acceptTrackedChangeBySelection' },
        resetDisabled: vi.fn(),
        activate: vi.fn(),
        deactivate: vi.fn(),
        setDisabled: vi.fn(),
        allowWithoutEditor: { value: false },
      },
      {
        name: { value: 'rejectTrackedChangeOnSelection' },
        resetDisabled: vi.fn(),
        activate: vi.fn(),
        deactivate: vi.fn(),
        setDisabled: vi.fn(),
        allowWithoutEditor: { value: false },
      },
    ];

    toolbar.activeEditor = mockEditor;
    toolbar.documentMode = 'editing';
  });

  it('should update toolbar state with active formatting marks', () => {
    mockGetActiveFormatting.mockReturnValue([
      { name: 'bold', attrs: {} },
      { name: 'italic', attrs: {} },
    ]);

    mockIsInTable.mockReturnValue(false);
    mockGetQuickFormatList.mockReturnValue(['style1', 'style2']);

    toolbar.updateToolbarState();

    expect(toolbar.toolbarItems[0].resetDisabled).toHaveBeenCalled();
    expect(toolbar.toolbarItems[0].activate).toHaveBeenCalledWith({}); // bold
    expect(toolbar.toolbarItems[1].resetDisabled).toHaveBeenCalled();
    expect(toolbar.toolbarItems[1].activate).toHaveBeenCalledWith({}); // italic

    expect(mockGetActiveFormatting).toHaveBeenCalledWith(mockEditor);
  });

  it('should keep toggles inactive when negation marks are active', () => {
    mockGetActiveFormatting.mockReturnValue([
      { name: 'bold', attrs: { value: '0' } },
      { name: 'underline', attrs: { underlineType: 'none' } },
    ]);

    toolbar.updateToolbarState();

    const boldItem = toolbar.toolbarItems.find((item) => item.name.value === 'bold');
    const underlineItem = toolbar.toolbarItems.find((item) => item.name.value === 'underline');

    expect(boldItem.activate).not.toHaveBeenCalled();
    expect(boldItem.deactivate).toHaveBeenCalled();
    expect(underlineItem.activate).not.toHaveBeenCalled();
    expect(underlineItem.deactivate).toHaveBeenCalled();
  });

  it('should not reactivate via linked styles when a negation mark is present', () => {
    mockGetActiveFormatting.mockReturnValue([
      { name: 'bold', attrs: { value: '0' } },
      { name: 'styleId', attrs: { styleId: 'style-1' } },
    ]);

    mockEditor.converter.linkedStyles = [
      {
        id: 'style-1',
        definition: { styles: { bold: { value: true } } },
      },
    ];

    toolbar.updateToolbarState();

    const boldItem = toolbar.toolbarItems.find((item) => item.name.value === 'bold');
    expect(boldItem.activate).not.toHaveBeenCalled();
    expect(boldItem.deactivate).toHaveBeenCalled();
  });

  it('disables tracked change buttons when permission resolver denies access', () => {
    mockGetActiveFormatting.mockReturnValue([]);
    mockCollectTrackedChanges.mockReturnValue([{ id: 'change-1', attrs: { authorEmail: 'author@example.com' } }]);
    mockIsTrackedChangeActionAllowed.mockImplementation(({ action }) => action === 'reject');

    toolbar.updateToolbarState();

    expect(mockCollectTrackedChanges).toHaveBeenCalled();

    const acceptItem = toolbar.toolbarItems.find((item) => item.name.value === 'acceptTrackedChangeBySelection');
    const rejectItem = toolbar.toolbarItems.find((item) => item.name.value === 'rejectTrackedChangeOnSelection');

    expect(acceptItem.setDisabled).toHaveBeenCalledWith(true);
    expect(rejectItem.setDisabled).toHaveBeenCalledWith(false);
  });

  it('disables tracked change buttons when there are no tracked changes in selection', () => {
    mockGetActiveFormatting.mockReturnValue([]);
    mockCollectTrackedChanges.mockReturnValue([]);

    toolbar.updateToolbarState();

    const acceptItem = toolbar.toolbarItems.find((item) => item.name.value === 'acceptTrackedChangeBySelection');
    const rejectItem = toolbar.toolbarItems.find((item) => item.name.value === 'rejectTrackedChangeOnSelection');

    expect(acceptItem.setDisabled).toHaveBeenCalledWith(true);
    expect(rejectItem.setDisabled).toHaveBeenCalledWith(true);
  });

  it('keeps tracked change buttons enabled for collapsed selection within change', () => {
    mockEditor.state.selection.from = 5;
    mockEditor.state.selection.to = 5;
    mockCollectTrackedChanges.mockReturnValue([{ id: 'change-1', attrs: { authorEmail: 'author@example.com' } }]);
    mockGetActiveFormatting.mockReturnValue([]);

    toolbar.updateToolbarState();

    const acceptItem = toolbar.toolbarItems.find((item) => item.name.value === 'acceptTrackedChangeBySelection');
    const rejectItem = toolbar.toolbarItems.find((item) => item.name.value === 'rejectTrackedChangeOnSelection');

    expect(acceptItem.setDisabled).toHaveBeenCalledWith(false);
    expect(rejectItem.setDisabled).toHaveBeenCalledWith(false);
  });

  it('should deactivate toolbar items when no active editor', () => {
    toolbar.activeEditor = null;

    toolbar.updateToolbarState();

    toolbar.toolbarItems.forEach((item) => {
      expect(item.setDisabled).toHaveBeenCalledWith(true);
    });
  });

  it('should deactivate toolbar items when in viewing mode', () => {
    toolbar.documentMode = 'viewing';

    toolbar.updateToolbarState();

    toolbar.toolbarItems.forEach((item) => {
      expect(item.setDisabled).toHaveBeenCalledWith(true);
    });
  });

  it('should prioritize active mark over linked styles (font family)', () => {
    mockGetActiveFormatting.mockReturnValue([
      { name: 'fontFamily', attrs: { fontFamily: 'Roboto' } },
      { name: 'styleId', attrs: { styleId: 'test-style' } },
    ]);

    mockEditor.converter.linkedStyles = [
      {
        id: 'test-style',
        definition: { styles: { 'font-family': 'Arial' } },
      },
    ];

    toolbar.updateToolbarState();

    const fontFamilyItem = toolbar.toolbarItems.find((item) => item.name.value === 'fontFamily');
    expect(fontFamilyItem.activate).toHaveBeenCalledWith({ fontFamily: 'Roboto' });
    expect(fontFamilyItem.activate).not.toHaveBeenCalledWith({ fontFamily: 'Arial' });
  });

  it('should prioritize active mark over linked styles (font size)', () => {
    mockGetActiveFormatting.mockReturnValue([
      { name: 'fontSize', attrs: { fontSize: '20pt' } },
      { name: 'styleId', attrs: { styleId: 'test-style' } },
    ]);

    mockEditor.converter.linkedStyles = [
      {
        id: 'test-style',
        definition: { styles: { 'font-size': '14pt' } },
      },
    ];

    toolbar.updateToolbarState();

    const fontSizeItem = toolbar.toolbarItems.find((item) => item.name.value === 'fontSize');
    expect(fontSizeItem.activate).toHaveBeenCalledWith({ fontSize: '20pt' }, false);
    expect(fontSizeItem.activate).not.toHaveBeenCalledWith({ fontSize: '14pt' });
  });
});
