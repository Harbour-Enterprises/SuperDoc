import { Node, Attribute } from '@core/index.js';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export const TabNode = Node.create({
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

  renderDOM({ htmlAttributes }) {
    return ['span', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addAttributes() {
    return {
      tabSize: {
        renderDOM: ({ tabSize }) => {
          if (!tabSize) return {};
          const style = `width: ${tabSize}px; min-width: ${tabSize}px;`;
          return { style };
        },
      },
      // Leader type for TOC tabs (e.g., dot, hyphen, heavy, middleDot, none)
      leader: {
        default: null,
        renderDOM: ({ leader }) => {
          if (!leader) return {};
          return { 'data-leader': leader };
        },
      },
      // Marks this tab as coming from a Table of Contents
      isToc: {
        default: false,
        renderDOM: ({ isToc }) => {
          return isToc ? { class: 'sd-toc-tab' } : {};
        },
      },
    };
  },

  addPmPlugins() {
    const { view } = this.editor;
    const tabPlugin = new Plugin({
      name: 'tabPlugin',
      key: new PluginKey('tabPlugin'),
      state: {
        init(_, state) {
          let decorations = getTabDecorations(state, view);
          return DecorationSet.create(state.doc, decorations);
        },

        apply(tr, oldDecorationSet, oldState, newState) {
          if (!tr.docChanged) return oldDecorationSet;
          const decorations = getTabDecorations(newState, view);
          return DecorationSet.create(newState.doc, decorations);
        },
      },
      props: {
        decorations(state) {
          return this.getState(state);
        },
      },
    });
    return [tabPlugin];
  },
});

const tabWidthPx = 48;

const getTabDecorations = (state, view) => {
  let decorations = [];
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'tab') {
      let $pos = state.doc.resolve(pos);
      const prevNodeSize = $pos.nodeBefore?.nodeSize || 0;

      let textWidth = 0;

      try {
        state.doc.nodesBetween(pos - prevNodeSize - 1, pos - 1, (node, nodePos) => {
          if (node.isText && node.textContent !== ' ') {
            const textWidthForNode = calcTextWidth(view, nodePos);
            textWidth += textWidthForNode;
          }
        });
      } catch (e) {
        return;
      }

      const tabWidth = $pos.nodeBefore?.type.name === 'tab' ? tabWidthPx : tabWidthPx - (textWidth % tabWidthPx);
      const tabHeight = calcTabHeight($pos);

      decorations.push(
        Decoration.node(pos, pos + node.nodeSize, { style: `width: ${tabWidth}px; height: ${tabHeight};` }),
      );
    }
  });
  return decorations;
};

function calcTextWidth(view, pos) {
  const domNode = view.nodeDOM(pos);
  if (domNode) {
    const range = document.createRange();
    range.selectNodeContents(domNode);
    return range.getBoundingClientRect().width;
  }
  return 0;
}

function calcTabHeight(pos) {
  const ptToPxRatio = 1.333;
  const defaultFontSize = 16;
  const defaultLineHeight = 1.1;

  const blockParent = pos.node(1);
  const parentTextStyleMark = blockParent.firstChild.marks.find((mark) => mark.type.name === 'textStyle');

  const fontSize = parseInt(parentTextStyleMark?.attrs.fontSize) * ptToPxRatio || defaultFontSize;

  return `${fontSize * defaultLineHeight}px`;
}
