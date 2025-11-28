import { Node, Attribute } from '@core/index.js';
import type { Node as PmNode } from 'prosemirror-model';
import { Plugin, PluginKey } from 'prosemirror-state';
import { DecorationSet, Decoration } from 'prosemirror-view';
import type { EditorView } from 'prosemirror-view';
import { isHeadless } from '@/utils/headless-helpers.js';
import { createLayoutRequest, calculateTabLayout, applyLayoutResult } from './helpers/tabAdapter.js';
import type { Editor } from '@core/Editor.js';
import type { AttributeValue, RenderNodeContext } from '@core/index.js';

/**
 * Configuration options for TabNode
 * @category Options
 */
export interface TabNodeOptions extends Record<string, unknown> {
  /** HTML attributes for tab elements */
  htmlAttributes: Record<string, AttributeValue>;
}

/**
 * Attributes for tab nodes
 * @category Attributes
 */
export interface TabNodeAttributes {
  /** Width of the tab in pixels */
  tabSize?: number;
}

/**
 * @module TabNode
 * @sidebarTitle Tab
 * @snippetPath /snippets/extensions/tab.mdx
 */
export const TabNode = Node.create<TabNodeOptions>({
  name: 'tab',
  group: 'inline',
  inline: true,
  // need this prop so Prosemirror doesn't treat tab as an
  // empty node and doesn't insert separator after
  content: 'inline*',
  selectable: false,
  atom: true,

  addOptions() {
    return {
      htmlAttributes: {
        class: 'sd-editor-tab',
        // this works together with content prop:
        // since tab can't have content inside but content prop is defined I have to manually add attribute
        contentEditable: false,
      },
    };
  },

  parseDOM() {
    return [{ tag: 'span.sd-editor-tab' }];
  },

  renderDOM({ htmlAttributes }: RenderNodeContext) {
    return [
      'span',
      Attribute.mergeAttributes(this.options?.htmlAttributes ?? {}, htmlAttributes as Record<string, AttributeValue>),
      0,
    ];
  },

  addAttributes() {
    return {
      tabSize: {
        renderDOM: ({ tabSize }: { tabSize?: number | null }) => {
          if (!tabSize) return {};
          const style = `width: ${tabSize}px; min-width: ${tabSize}px;`;
          return { style };
        },
      },
    };
  },

  addPmPlugins() {
    // Skip tab plugin entirely in headless mode
    if (!this.editor || isHeadless(this.editor)) {
      return [];
    }

    const { view, helpers } = this.editor;

    const tabPlugin = new Plugin({
      name: 'tabPlugin',
      key: new PluginKey('tabPlugin'),
      state: {
        init() {
          return { decorations: DecorationSet.empty, revision: 0 };
        },
        apply(tr, { decorations, revision }, _oldState, newState) {
          // Initialize decorations on first call
          if (!decorations || decorations === DecorationSet.empty) {
            const newDecorations = buildDecorations(newState.doc, view, helpers, 0);
            return { decorations: newDecorations, revision: 0 };
          }

          // Early return for non-document changes
          if (!tr.docChanged || tr.getMeta('blockNodeInitialUpdate')) {
            return { decorations, revision };
          }

          // Recompute decorations for the document (coarse-grained; can be optimized later)
          const nextRevision = revision + 1;
          const newDecorations = buildDecorations(newState.doc, view, helpers, nextRevision);
          return { decorations: newDecorations, revision: nextRevision };
        },
      },
      props: {
        decorations(state) {
          const pluginState = this.getState(state);
          return pluginState?.decorations || DecorationSet.empty;
        },
      },
    });
    return [tabPlugin];
  },
});

function buildDecorations(doc: PmNode, view: EditorView, helpers: Editor['helpers'], revision: number): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== 'paragraph') return;
    let hasTab = false;
    node.descendants((child) => {
      if (child.type.name === 'tab') {
        hasTab = true;
        return false;
      }
      return true;
    });
    if (!hasTab) return;

    const request = createLayoutRequest(doc, pos + 1, view, helpers, revision, undefined);
    if (!request) return;
    const result = calculateTabLayout(request, undefined, view);
    const paragraphDecorations = applyLayoutResult(result, node, pos);
    decorations.push(...paragraphDecorations);
  });
  return DecorationSet.create(doc, decorations);
}
