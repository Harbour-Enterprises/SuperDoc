import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { ReplaceStep } from 'prosemirror-transform';
import { calculateResolvedParagraphProperties } from './resolvedPropertiesCache.js';
import type { Node as PmNode } from 'prosemirror-model';
import type { EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { Editor } from '@core/Editor.js';

export function createDropcapPlugin(editor: Editor): Plugin {
  const { view } = editor;
  const dropcapWidthCache = new Map<number, number>();

  /**
   * Removes cached dropcap widths that fall within the affected document range.
   */
  const invalidateCacheForRange = (from: number, to: number): void => {
    for (const [pos] of dropcapWidthCache) {
      if (pos >= from && pos <= to) {
        dropcapWidthCache.delete(pos);
      }
    }
  };

  const getDropcapDecorations = (
    state: EditorState,
    view: EditorView,
    widthCache: Map<number, number>,
  ): Decoration[] => {
    const decorations = [];

    state.doc.descendants((node, pos) => {
      if (hasDropcapParagraph(node, pos, state)) {
        const width = getDropcapWidth(view, pos, widthCache);
        decorations.push(Decoration.inline(pos, pos + node.nodeSize, { style: `margin-left: -${width}px;` }));
        return false;
      }

      return node.type.name !== 'paragraph';
    });

    return decorations;
  };

  function getDropcapWidth(view: EditorView, pos: number, widthCache: Map<number, number>): number {
    if (widthCache.has(pos)) {
      return widthCache.get(pos);
    }

    const domNode = view.nodeDOM(pos);
    if (domNode) {
      const range = document.createRange();
      range.selectNodeContents(domNode);
      const width = range.getBoundingClientRect().width;
      widthCache.set(pos, width);
      return width;
    }

    return 0;
  }

  /**
   * Determines whether the node is a margin dropcap paragraph.
   */
  const hasDropcapParagraph = (node: PmNode, pos: number, state: EditorState): boolean => {
    if (node.type.name !== 'paragraph') return false;
    const paragraphProps = calculateResolvedParagraphProperties(editor, node, state.doc.resolve(pos));
    return paragraphProps.framePr?.dropCap === 'margin';
  };

  return new Plugin({
    name: 'dropcapPlugin',
    key: new PluginKey('dropcapPlugin'),
    state: {
      init(_, state) {
        const decorations = getDropcapDecorations(state, view, dropcapWidthCache);
        return DecorationSet.create(state.doc, decorations);
      },

      apply(tr, oldDecorationSet, oldState, newState) {
        if (!tr.docChanged) return oldDecorationSet;

        // Early exit if no dropcaps in document
        let hasDropcaps = false;
        newState.doc.descendants((node, pos) => {
          if (hasDropcapParagraph(node, pos, newState)) {
            hasDropcaps = true;
            return false;
          }
        });

        if (!hasDropcaps) {
          dropcapWidthCache.clear();
          return DecorationSet.empty;
        }

        // Check if transaction affects dropcap paragraphs
        let affectsDropcaps = false;

        tr.steps.forEach((step) => {
          if (step instanceof ReplaceStep && step.slice?.content) {
            step.slice.content.descendants((node, pos) => {
              if (hasDropcapParagraph(node, pos, newState)) {
                affectsDropcaps = true;
                return false;
              }
            });
          }

          if (step instanceof ReplaceStep && step.from !== undefined && step.to !== undefined) {
            try {
              oldState.doc.nodesBetween(step.from, step.to, (node, pos) => {
                if (hasDropcapParagraph(node, pos, newState)) {
                  affectsDropcaps = true;
                  return false;
                }
              });
            } catch {
              affectsDropcaps = true;
            }
          }
        });

        if (!affectsDropcaps) {
          return oldDecorationSet.map(tr.mapping, tr.doc);
        }

        // Invalidate cached widths for affected ranges
        tr.steps.forEach((step) => {
          if (step instanceof ReplaceStep && step.from !== undefined && step.to !== undefined) {
            invalidateCacheForRange(step.from, step.to);
          }
        });

        const decorations = getDropcapDecorations(newState, view, dropcapWidthCache);
        return DecorationSet.create(newState.doc, decorations);
      },
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
    },
  });
}
