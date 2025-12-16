import { Node, Attribute } from '@core/index.js';
import type { Node as PmNode } from 'prosemirror-model';
import { Plugin, PluginKey } from 'prosemirror-state';
import type { Transaction, EditorState } from 'prosemirror-state';
import type { Step } from 'prosemirror-transform';
import { DecorationSet, Decoration } from 'prosemirror-view';
import type { EditorView } from 'prosemirror-view';
import { isHeadless } from '@/utils/headless-helpers';
import { createLayoutRequest, calculateTabLayout, applyLayoutResult } from './helpers/tabAdapter.js';
import type { Editor } from '@core/Editor.js';
import type { AttributeValue, RenderNodeContext } from '@core/index.js';
import { clearAllParagraphContexts } from './helpers/paragraphContextCache.js';

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
          const initialDecorations = buildInitialDecorations(view.state.doc, view, helpers, 0);
          return { decorations: initialDecorations, revision: 0 };
        },
        apply(tr, { decorations, revision }, _oldState, newState) {
          const currentDecorations =
            decorations && (decorations as DecorationSet).map
              ? (decorations as DecorationSet).map(tr.mapping, tr.doc)
              : DecorationSet.empty;

          // Early return for non-document changes
          if (!tr.docChanged || tr.getMeta('blockNodeInitialUpdate')) {
            return { decorations: currentDecorations, revision };
          }

          const affectedParagraphs: Set<number> = getAffectedParagraphStarts(tr, newState);
          if (affectedParagraphs.size === 0) {
            return { decorations: currentDecorations, revision };
          }

          let nextDecorations = currentDecorations;
          affectedParagraphs.forEach((pos: number) => {
            const paragraph = newState.doc.nodeAt(pos);
            if (!paragraph || paragraph.type.name !== 'paragraph') return;

            const from = pos;
            const to = pos + paragraph.nodeSize;
            const existing = nextDecorations.find(from, to);
            if (existing?.length) {
              nextDecorations = nextDecorations.remove(existing);
            }

            const paragraphDecorations = buildParagraphDecorations(
              newState.doc,
              pos + 1,
              paragraph,
              view,
              helpers,
              revision + 1,
            );
            nextDecorations = nextDecorations.add(newState.doc, paragraphDecorations);
          });

          return { decorations: nextDecorations, revision: revision + 1 };
        },
      },
      props: {
        decorations(state) {
          const pluginState = this.getState(state);
          return pluginState?.decorations || DecorationSet.empty;
        },
      },
      view() {
        return {
          destroy() {
            // Clear paragraph context cache on plugin destruction to prevent memory leaks
            clearAllParagraphContexts();
          },
        };
      },
    });
    return [tabPlugin];
  },
});

function buildInitialDecorations(
  doc: PmNode,
  view: EditorView,
  helpers: Editor['helpers'],
  revision: number,
): DecorationSet {
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

function buildParagraphDecorations(
  doc: PmNode,
  paragraphContentPos: number,
  paragraphNode: PmNode,
  view: EditorView,
  helpers: Editor['helpers'],
  revision: number,
): Decoration[] {
  const request = createLayoutRequest(doc, paragraphContentPos, view, helpers, revision);
  if (!request) return [];
  const result = calculateTabLayout(request, undefined, view);
  return applyLayoutResult(result, paragraphNode, paragraphContentPos - 1);
}

/**
 * Type guard to check if a step has positional information
 */
function hasPositionalInfo(step: Step): step is Step & { from: number; to: number } {
  return (
    'from' in step &&
    'to' in step &&
    typeof (step as Step & { from?: unknown }).from === 'number' &&
    typeof (step as Step & { to?: unknown }).to === 'number'
  );
}

/**
 * Identifies paragraphs affected by transaction steps.
 * Recomputes all paragraphs in the affected range, relying on paragraph context caching
 * to make this efficient. Checks mapped positions for validity to avoid invalid additions.
 *
 * @param {import('prosemirror-state').Transaction} tr - The transaction
 * @param {import('prosemirror-state').EditorState} newState - The new editor state
 * @returns {Set<number>} Set of paragraph start positions
 */
function getAffectedParagraphStarts(tr: Transaction, newState: EditorState): Set<number> {
  const affected: Set<number> = new Set();

  tr.steps.forEach((step, index) => {
    // Only consider steps that touch the document with positional information
    if (!hasPositionalInfo(step)) return;

    // Map positions through subsequent step mappings to get final positions
    let fromPos = step.from;
    let toPos = step.to;

    for (let i = index; i < tr.steps.length; i++) {
      const stepMap = tr.steps[i].getMap();
      fromPos = stepMap.map(fromPos, -1);
      toPos = stepMap.map(toPos, 1);
    }

    // Check for invalid mapped positions (-1 indicates deleted positions)
    if (fromPos < 0 || toPos < 0 || fromPos > newState.doc.content.size || toPos > newState.doc.content.size) {
      return;
    }

    // Find all paragraphs in the affected range
    // Caching makes this efficient even without tab presence checking
    newState.doc.nodesBetween(fromPos, toPos, (node, pos) => {
      if (node.type.name === 'paragraph') {
        affected.add(pos);
        return false;
      }
      return true;
    });
  });

  return affected;
}
