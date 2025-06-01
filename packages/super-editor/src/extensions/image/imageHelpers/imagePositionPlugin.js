import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { PaginationPluginKey } from '../../pagination/pagination-helpers.js';

const ImagePositionPluginKey = new PluginKey('ImagePosition');
export const ImagePositionPlugin = ({ editor }) => {
  const { view } = editor;
  let shouldUpdate = false;
  return new Plugin({
    name: 'ImagePositionPlugin',
    key: ImagePositionPluginKey,

    state: {
      init(_, state) {
        return DecorationSet.empty;
      },

      apply(tr, oldDecorationSet, oldState, newState) {
        const decorations = getImagePositionDecorations(newState, view);
        return DecorationSet.create(newState.doc, decorations);
      },
    },

    view: (view) => {
      return {
        update: (view, lastState) => {
          const pagination = PaginationPluginKey.getState(lastState);
          if (shouldUpdate) {
            shouldUpdate = false;
            const decorations = getImagePositionDecorations(lastState, view);
            const updateTransaction = view.state.tr.setMeta(ImagePositionPluginKey, { decorations });
            view.dispatch(updateTransaction);
          }
          if (pagination?.isReadyToInit) {
            shouldUpdate = true;
          }
        },
      };
    },

    props: {
      decorations(state) {
        return this.getState(state);
      },
    },
  });
};

const getImagePositionDecorations = (state, view) => {
  let decorations = [];
  state.doc.descendants((node, pos) => {
    if (node.attrs.anchorData) {
      let style = '';
      let className = '';
      const { vRelativeFrom, alignH } = node.attrs.anchorData;
      const { size, padding } = node.attrs;

      const pageBreak = findPreviousDomNodeWithClass(view, pos, 'pagination-break-wrapper');
      if (pageBreak) {
        switch (alignH) {
          case 'left':
            style += 'float: left; left: 0; margin-left: 0; ';
            break;
          case 'right':
            style += 'float: right; right: 0; margin-right: 0; ';
            break;
          case 'center':
            style += 'display: block; margin-left: auto; margin-right: auto; ';
            break;
        }
        style +=
          vRelativeFrom === 'margin'
            ? `position: absolute; top: ${pageBreak?.offsetTop + pageBreak?.offsetHeight}px; `
            : '';

        if (vRelativeFrom === 'margin') {
          const nextPos = view.posAtDOM(pageBreak, 1);
          const imageBlock = document.createElement('div');
          imageBlock.className = 'anchor-image-placeholder';
          imageBlock.style.float = alignH;
          imageBlock.style.width = size.width + parseInt(padding[alignH]) + 'px';
          imageBlock.style.height = size.height + parseInt(padding.top) + parseInt(padding.bottom) + 'px';
          decorations.push(Decoration.widget(nextPos, imageBlock, { key: 'stable-key' }));
        }
      }

      decorations.push(Decoration.node(pos, pos + node.nodeSize, { style, class: className }));
    }
  });
  return decorations;
};

const findPreviousDomNodeWithClass = (view, pos, className) => {
  let { node } = view.domAtPos(pos);

  // If you get a text node, go to its parent
  if (node.nodeType === 3) {
    node = node.parentNode;
  }

  // Walk backward over siblings and their ancestors
  while (node) {
    if (node.classList && node.classList.contains(className)) {
      return node;
    }
    if (node.previousSibling) {
      node = node.previousSibling;
      // Dive to the last child if it's an element with children
      while (node && node.lastChild) {
        node = node.lastChild;
      }
    } else {
      node = node.parentNode;
    }
  }

  return null; // Not found
};
