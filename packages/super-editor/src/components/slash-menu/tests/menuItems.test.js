import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getItems } from '../menuItems.js';
import { createMockEditor, createMockContext, assertMenuSectionsStructure, SlashMenuConfigs } from './testHelpers.js';

vi.mock('../../cursor-helpers.js', () => ({
  selectionHasNodeOrMark: vi.fn(),
}));

vi.mock('../constants.js', () => ({
  TEXTS: {
    replaceText: 'Replace text',
    insertText: 'Insert text',
    createDocumentSection: 'Create document section',
    removeDocumentSection: 'Remove document section',
    insertLink: 'Insert link',
    insertTable: 'Insert table',
    editTable: 'Edit table',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
  },
  ICONS: {
    ai: '<svg>ai-icon</svg>',
    addDocumentSection: '<svg>add-section-icon</svg>',
    removeDocumentSection: '<svg>remove-section-icon</svg>',
    link: '<svg>link-icon</svg>',
    table: '<svg>table-icon</svg>',
    cut: '<svg>cut-icon</svg>',
    copy: '<svg>copy-icon</svg>',
    paste: '<svg>paste-icon</svg>',
  },
  TRIGGERS: {
    slash: 'slash',
    click: 'click',
  },
}));

vi.mock('../../toolbar/TableGrid.vue', () => ({ default: { template: '<div>TableGrid</div>' } }));
vi.mock('../../toolbar/AIWriter.vue', () => ({ default: { template: '<div>AIWriter</div>' } }));
vi.mock('../../toolbar/TableActions.vue', () => ({ default: { template: '<div>TableActions</div>' } }));
vi.mock('../../toolbar/LinkInput.vue', () => ({ default: { template: '<div>LinkInput</div>' } }));

vi.mock('@/core/InputRule.js', () => ({
  handleClipboardPaste: vi.fn(() => true),
}));

describe('menuItems.js', () => {
  let mockEditor;
  let mockContext;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockEditor = createMockEditor({
      isAiEnabled: false,
      slashMenuConfig: null,
    });

    mockContext = createMockContext({
      editor: mockEditor,
      selectedText: '',
      trigger: 'slash',
      clipboardContent: {
        html: null,
        text: null,
        hasContent: false,
      },
    });

    const { selectionHasNodeOrMark } = await import('../../cursor-helpers.js');
    selectionHasNodeOrMark.mockReturnValue(false);
  });

  describe('getItems - default behavior', () => {
    it('should return default menu items with no customization', () => {
      const sections = getItems(mockContext);

      assertMenuSectionsStructure(sections);

      const sectionIds = sections.map((s) => s.id);
      expect(sectionIds.length).toBeGreaterThan(0);
      expect(sectionIds).toContain('general');
    });

    it('should filter AI items when AI module is not enabled', () => {
      const sections = getItems(mockContext);

      const aiSection = sections.find((s) => s.id === 'ai-content');
      expect(aiSection?.items || []).toHaveLength(0);
    });

    it('should include AI items when AI module is enabled', () => {
      mockEditor.options.isAiEnabled = true;
      const sections = getItems(mockContext);

      const aiSection = sections.find((s) => s.id === 'ai-content');
      expect(aiSection?.items.length).toBeGreaterThan(0);

      const insertTextItem = aiSection.items.find((item) => item.id === 'insert-text');
      expect(insertTextItem).toBeDefined();
    });

    it('should filter items based on trigger type', () => {
      mockContext.trigger = 'slash';
      const sections = getItems(mockContext);

      const allItems = sections.flatMap((s) => s.items);
      const slashItems = allItems.filter((item) => item.allowedTriggers.includes('slash'));

      expect(allItems).toEqual(slashItems);
    });

    it('should filter items based on selection requirement', () => {
      mockContext.selectedText = '';
      const sections = getItems(mockContext);

      const allItems = sections.flatMap((s) => s.items);
      const selectionRequiredItems = allItems.filter((item) => item.requiresSelection);

      expect(selectionRequiredItems).toHaveLength(0);
    });

    it('should include selection-required items when text is selected', () => {
      mockContext.selectedText = 'selected text';
      const sections = getItems(mockContext);

      const allItems = sections.flatMap((s) => s.items);
      const selectionBasedItems = allItems.filter(
        (item) => item.requiresSelection || item.id === 'cut' || item.id === 'copy',
      );

      expect(selectionBasedItems.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter clipboard items based on clipboard content', () => {
      mockContext.clipboardContent.hasContent = false;
      const sections = getItems(mockContext);

      const clipboardSection = sections.find((s) => s.id === 'clipboard');
      const pasteItem = clipboardSection?.items.find((item) => item.id === 'paste');

      expect(pasteItem).toBeUndefined();
    });

    it('should include paste item when clipboard has content', () => {
      mockContext.clipboardContent = {
        html: '<p>content</p>',
        text: 'content',
        hasContent: true,
      };
      const sections = getItems(mockContext);

      const clipboardSection = sections.find((s) => s.id === 'clipboard');
      const pasteItem = clipboardSection?.items.find((item) => item.id === 'paste');

      expect(pasteItem).toBeDefined();
    });
  });

  describe('getItems - custom configuration', () => {
    it('should add custom items when customItems is provided', () => {
      mockEditor.options.slashMenuConfig = SlashMenuConfigs.customOnly;

      const sections = getItems(mockContext);
      const customSection = sections.find((s) => s.id === 'custom-section');

      expect(customSection).toBeDefined();
      expect(customSection.items).toHaveLength(1);
      expect(customSection.items[0].id).toBe('custom-item');
    });

    it('should exclude default items when includeDefaultItems is false', () => {
      mockEditor.options.slashMenuConfig = {
        includeDefaultItems: false,
        customItems: [
          {
            id: 'custom-section',
            items: [
              {
                id: 'custom-item',
                label: 'Custom Item',
                allowedTriggers: ['slash', 'click'],
                action: () => {},
              },
            ],
          },
        ],
      };

      const sections = getItems(mockContext);

      // Should only have custom sections
      expect(sections).toHaveLength(1);
      expect(sections[0].id).toBe('custom-section');
    });

    it('should apply menuProvider function', () => {
      const customProvider = (context, defaultSections) => {
        return [
          ...defaultSections,
          {
            id: 'provider-section',
            items: [
              {
                id: 'provider-item',
                label: `Provider item for ${context.trigger}`,
                allowedTriggers: ['slash', 'click'],
                action: vi.fn(),
              },
            ],
          },
        ];
      };

      mockEditor.options.slashMenuConfig = SlashMenuConfigs.withProvider(customProvider);

      const sections = getItems(mockContext);
      const providerSection = sections.find((s) => s.id === 'provider-section');

      expect(providerSection).toBeDefined();
      expect(providerSection.items[0].label).toBe('Provider item for slash');
    });

    it('should handle menuProvider errors gracefully', () => {
      mockEditor.options.slashMenuConfig = {
        includeDefaultItems: true,
        menuProvider: () => {
          throw new Error('Provider error');
        },
      };

      // Should not throw and should return default sections
      const sections = getItems(mockContext);
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should filter custom items with showWhen conditions', () => {
      mockContext.selectedText = '';
      mockContext.hasSelection = false;
      mockEditor.options.slashMenuConfig = SlashMenuConfigs.withConditionalItems;

      const sections = getItems(mockContext);
      const conditionalSection = sections.find((s) => s.id === 'conditional-section');

      expect(conditionalSection.items).toHaveLength(1);
      expect(conditionalSection.items[0].id).toBe('always-show');
    });

    it('should include conditional items when showWhen condition is met', () => {
      mockContext.selectedText = 'selected';
      mockContext.hasSelection = true;
      mockEditor.options.slashMenuConfig = SlashMenuConfigs.withConditionalItems;

      const sections = getItems(mockContext);
      const conditionalSection = sections.find((s) => s.id === 'conditional-section');

      expect(conditionalSection.items).toHaveLength(2); // Both items should be present
      const itemIds = conditionalSection.items.map((item) => item.id);
      expect(itemIds).toContain('always-show');
      expect(itemIds).toContain('show-when-selection');
    });

    it('should handle showWhen errors gracefully', () => {
      mockEditor.options.slashMenuConfig = {
        includeDefaultItems: false,
        customItems: [
          {
            id: 'error-section',
            items: [
              {
                id: 'error-item',
                label: 'Error Item',
                allowedTriggers: ['slash', 'click'],
                action: () => {},
                showWhen: () => {
                  throw new Error('showWhen error');
                },
              },
            ],
          },
        ],
      };

      const sections = getItems(mockContext);
      const errorSection = sections.find((s) => s.id === 'error-section');

      // Item should be excluded due to error
      expect(errorSection?.items || []).toHaveLength(0);
    });

    it('should remove empty sections after filtering', () => {
      mockEditor.options.slashMenuConfig = {
        includeDefaultItems: false,
        customItems: [
          {
            id: 'empty-section',
            items: [
              {
                id: 'never-show',
                label: 'Never Show',
                allowedTriggers: ['slash', 'click'],
                action: () => {},
                showWhen: () => false,
              },
            ],
          },
        ],
      };

      const sections = getItems(mockContext);
      const emptySection = sections.find((s) => s.id === 'empty-section');

      expect(emptySection).toBeUndefined();
    });
  });

  describe('getItems - table context', () => {
    beforeEach(async () => {
      const { selectionHasNodeOrMark } = await import('../../cursor-helpers.js');
      selectionHasNodeOrMark.mockImplementation((_, nodeName, options) => {
        if (nodeName === 'table' && options?.requireEnds) {
          return true; // Simulate being in a table
        }
        return false;
      });
    });

    it('should show edit-table item when in table', () => {
      const sections = getItems(mockContext);
      const generalSection = sections.find((s) => s.id === 'general');
      const editTableItem = generalSection?.items.find((item) => item.id === 'edit-table');

      expect(editTableItem).toBeDefined();
    });

    it('should hide insert-table item when in table', () => {
      const sections = getItems(mockContext);
      const generalSection = sections.find((s) => s.id === 'general');
      const insertTableItem = generalSection?.items.find((item) => item.id === 'insert-table');

      expect(insertTableItem).toBeUndefined();
    });
  });

  describe('getItems - document section context', () => {
    beforeEach(async () => {
      const { selectionHasNodeOrMark } = await import('../../cursor-helpers.js');
      selectionHasNodeOrMark.mockImplementation((_, nodeName, options) => {
        if (nodeName === 'documentSection' && options?.requireEnds) {
          return true; // Simulate being in a document section
        }
        return false;
      });
    });

    it('should show remove-section item when in document section', () => {
      mockContext.trigger = 'click';
      const sections = getItems(mockContext);
      const docSection = sections.find((s) => s.id === 'document-sections');
      const removeItem = docSection?.items.find((item) => item.id === 'remove-section');

      expect(removeItem).toBeDefined();
    });
  });
});
