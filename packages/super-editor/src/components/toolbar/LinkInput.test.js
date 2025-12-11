import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import LinkInput from './LinkInput.vue';

/**
 * Test suite for LinkInput.vue component, specifically focusing on the
 * getLinkHrefAtSelection() boundary checking logic introduced in commit dfb8e60f.
 *
 * These tests verify the type safety improvements and edge case handling:
 * - Proper Array.isArray() validation for marks arrays
 * - Null-safe access to link.attrs.href
 * - Graceful handling of null/undefined nodes
 * - Handling of malformed mark structures
 */
describe('LinkInput - getLinkHrefAtSelection type safety and boundary checking', () => {
  let mockClosePopover;

  const createMockEditor = (stateOverrides = {}) => {
    const defaultState = {
      selection: {
        from: 5,
        to: 5,
        empty: true,
        $from: {
          marks: () => [],
          nodeAfter: null,
          nodeBefore: null,
          parent: {
            childAfter: vi.fn(() => ({ offset: 0, node: null })),
            childBefore: vi.fn(() => ({ offset: 0, node: null })),
          },
          parentOffset: 0,
        },
        $to: {
          marks: () => [],
          parent: {
            childAfter: vi.fn(() => ({ offset: 0, node: null })),
            childBefore: vi.fn(() => ({ offset: 0, node: null })),
          },
          parentOffset: 0,
        },
      },
      storedMarks: null,
      schema: {
        marks: {
          link: { name: 'link' },
        },
      },
      doc: {
        textBetween: vi.fn(() => 'test'),
        nodesBetween: vi.fn(),
      },
    };

    return {
      state: { ...defaultState, ...stateOverrides },
      commands: {
        toggleLink: vi.fn(),
        unsetLink: vi.fn(),
      },
      view: {
        state: {
          selection: { $to: { pos: 10 } },
          tr: {
            setSelection: vi.fn(function () {
              return this;
            }),
          },
          doc: {
            resolve: vi.fn(),
          },
        },
        dispatch: vi.fn(),
        focus: vi.fn(),
      },
    };
  };

  beforeEach(() => {
    mockClosePopover = vi.fn();
  });

  describe('Type safety - Array.isArray() validation for marks', () => {
    it('should handle nodeAfter with null marks property gracefully', async () => {
      const mockEditor = createMockEditor();
      mockEditor.state.selection.$from.nodeAfter = { marks: null };

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Should not crash - the Array.isArray check protects against null
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.rawUrl).toBe('');
    });

    it('should handle nodeAfter with undefined marks property gracefully', async () => {
      const mockEditor = createMockEditor();
      mockEditor.state.selection.$from.nodeAfter = { marks: undefined };

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Should not crash - the Array.isArray check protects against undefined
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.rawUrl).toBe('');
    });

    it('should handle nodeAfter with non-array marks property gracefully', async () => {
      const mockEditor = createMockEditor();
      mockEditor.state.selection.$from.nodeAfter = { marks: 'not-an-array' };

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Should not crash - the Array.isArray check protects against strings
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.rawUrl).toBe('');
    });

    it('should handle nodeBefore with null marks property gracefully', async () => {
      const mockEditor = createMockEditor();
      mockEditor.state.selection.$from.nodeBefore = { marks: null };
      mockEditor.state.selection.$from.nodeAfter = null;

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Should not crash - the Array.isArray check protects against null
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.rawUrl).toBe('');
    });

    it('should handle nodeBefore with undefined marks property gracefully', async () => {
      const mockEditor = createMockEditor();
      mockEditor.state.selection.$from.nodeBefore = { marks: undefined };
      mockEditor.state.selection.$from.nodeAfter = null;

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Should not crash - the Array.isArray check protects against undefined
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.rawUrl).toBe('');
    });

    it('should handle nodeBefore with non-array marks property gracefully', async () => {
      const mockEditor = createMockEditor();
      mockEditor.state.selection.$from.nodeBefore = { marks: {} };
      mockEditor.state.selection.$from.nodeAfter = null;

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Should not crash - the Array.isArray check protects against objects
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.rawUrl).toBe('');
    });
  });

  describe('Type safety - null-safe access to link.attrs.href', () => {
    it('should handle link mark with null attrs gracefully', async () => {
      const linkMarkType = { name: 'link' };
      const mockEditor = createMockEditor();
      mockEditor.state.selection.$from.nodeAfter = {
        marks: [{ type: linkMarkType, attrs: null }],
      };

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Should not crash - null-safe access protects against null attrs
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.rawUrl).toBe('');
    });

    it('should handle link mark with undefined attrs gracefully', async () => {
      const linkMarkType = { name: 'link' };
      const mockEditor = createMockEditor();
      mockEditor.state.selection.$from.nodeAfter = {
        marks: [{ type: linkMarkType, attrs: undefined }],
      };

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Should not crash - null-safe access protects against undefined attrs
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.rawUrl).toBe('');
    });

    it('should handle link mark with missing href property gracefully', async () => {
      const linkMarkType = { name: 'link' };
      const mockEditor = createMockEditor();
      mockEditor.state.selection.$from.nodeAfter = {
        marks: [{ type: linkMarkType, attrs: {} }],
      };

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Should not crash - null-safe access handles missing href
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.rawUrl).toBe('');
    });

    it('should handle link mark with undefined href property gracefully', async () => {
      const linkMarkType = { name: 'link' };
      const mockEditor = createMockEditor();
      mockEditor.state.selection.$from.nodeAfter = {
        marks: [{ type: linkMarkType, attrs: { href: undefined } }],
      };

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Should handle undefined href
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.rawUrl).toBe('');
    });

    it('should handle link mark with null href property gracefully', async () => {
      const linkMarkType = { name: 'link' };
      const mockEditor = createMockEditor();
      mockEditor.state.selection.$from.nodeAfter = {
        marks: [{ type: linkMarkType, attrs: { href: null } }],
      };

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Should handle null href
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.rawUrl).toBe('');
    });

    it('should handle link mark with empty string href gracefully', async () => {
      const linkMarkType = { name: 'link' };
      const mockEditor = createMockEditor();
      mockEditor.state.selection.$from.nodeAfter = {
        marks: [{ type: linkMarkType, attrs: { href: '' } }],
      };

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Empty string href should result in empty rawUrl
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.rawUrl).toBe('');
    });
  });

  describe('Boundary checking - null/undefined nodes', () => {
    it('should handle null nodeAfter at document end', async () => {
      const mockEditor = createMockEditor();
      mockEditor.state.selection.$from.nodeAfter = null;
      mockEditor.state.selection.$from.nodeBefore = { marks: [] };

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Should not crash when nodeAfter is null
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle null nodeBefore at document start', async () => {
      const mockEditor = createMockEditor();
      mockEditor.state.selection.$from.nodeAfter = { marks: [] };
      mockEditor.state.selection.$from.nodeBefore = null;

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Should not crash when nodeBefore is null
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle both nodes being null (empty document)', async () => {
      const mockEditor = createMockEditor();
      mockEditor.state.selection.$from.nodeAfter = null;
      mockEditor.state.selection.$from.nodeBefore = null;

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Should not crash when both nodes are null
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.rawUrl).toBe('');
    });

    it('should handle undefined nodeAfter', async () => {
      const mockEditor = createMockEditor();
      mockEditor.state.selection.$from.nodeAfter = undefined;
      mockEditor.state.selection.$from.nodeBefore = { marks: [] };

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Should not crash when nodeAfter is undefined
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle undefined nodeBefore', async () => {
      const mockEditor = createMockEditor();
      mockEditor.state.selection.$from.nodeAfter = { marks: [] };
      mockEditor.state.selection.$from.nodeBefore = undefined;

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Should not crash when nodeBefore is undefined
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Non-empty selection with nodesBetween', () => {
    it('should handle nodesBetween with nodes that have null attrs', async () => {
      const linkMarkType = { name: 'link' };
      const mockEditor = createMockEditor();
      mockEditor.state.selection.empty = false;
      mockEditor.state.selection.from = 5;
      mockEditor.state.selection.to = 10;

      mockEditor.state.doc.nodesBetween.mockImplementation((from, to, callback) => {
        callback({ marks: [{ type: linkMarkType, attrs: null }] });
      });

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Should handle null attrs in nodesBetween gracefully
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.rawUrl).toBe('');
    });

    it('should handle nodesBetween with nodes that have undefined href', async () => {
      const linkMarkType = { name: 'link' };
      const mockEditor = createMockEditor();
      mockEditor.state.selection.empty = false;
      mockEditor.state.selection.from = 5;
      mockEditor.state.selection.to = 10;

      mockEditor.state.doc.nodesBetween.mockImplementation((from, to, callback) => {
        callback({ marks: [{ type: linkMarkType, attrs: { href: undefined } }] });
      });

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Should handle undefined href in nodesBetween gracefully
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.rawUrl).toBe('');
    });
  });

  describe('Edge cases', () => {
    it('should handle missing editor gracefully', async () => {
      const wrapper = mount(LinkInput, {
        props: {
          editor: null,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();

      // Should not crash with null editor
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.rawUrl).toBe('');
    });

    it('should handle missing editor.state gracefully', async () => {
      const wrapper = mount(LinkInput, {
        props: {
          editor: { view: {} },
          closePopover: mockClosePopover,
        },
      });

      await nextTick();

      // Should not crash with missing state
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.rawUrl).toBe('');
    });

    it('should handle missing link mark type in schema', async () => {
      const mockEditor = createMockEditor();
      mockEditor.state.schema.marks.link = null;

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Should handle missing link mark type
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.rawUrl).toBe('');
    });

    it('should handle undefined link mark type in schema', async () => {
      const mockEditor = createMockEditor();
      mockEditor.state.schema.marks.link = undefined;

      const wrapper = mount(LinkInput, {
        props: {
          editor: mockEditor,
          closePopover: mockClosePopover,
        },
      });

      await nextTick();
      await nextTick();

      // Should handle undefined link mark type
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.rawUrl).toBe('');
    });
  });
});
