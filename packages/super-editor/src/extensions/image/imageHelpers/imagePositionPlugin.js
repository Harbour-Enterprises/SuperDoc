// @ts-check
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { PaginationPluginKey } from '../../pagination/pagination-helpers.js';

const ImagePositionPluginKey = new PluginKey('ImagePosition');

/**
 * Creates a ProseMirror plugin for managing anchored image positioning
 * @category Helper
 * @param {Object} params - Plugin parameters
 * @param {Object} params.editor - Editor instance
 * @returns {Plugin} ProseMirror plugin for image positioning
 * @example
 * const plugin = ImagePositionPlugin({ editor });
 * @note Handles anchored images with text wrapping
 * @note Integrates with pagination for proper page positioning
 * @note Creates placeholder decorations for absolute positioned images
 */
export const ImagePositionPlugin = ({ editor }) => {
  const { view } = editor;
  let shouldUpdate = false;
  return new Plugin({
    name: 'ImagePositionPlugin',
    key: ImagePositionPluginKey,

    state: {
      init() {
        return DecorationSet.empty;
      },

      apply(tr, oldDecorationSet, oldState, newState) {
        if (!tr.docChanged) return oldDecorationSet;
        const decorations = getImagePositionDecorations(newState, view);
        return DecorationSet.create(newState.doc, decorations);
      },
    },

    view: () => {
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

/**
 * Generate decorations for anchored images based on their positioning attributes
 * @private
 * @param {Object} state - Editor state
 * @param {Object} view - Editor view
 * @returns {Array} Array of Decoration objects
 * @note Creates inline decorations with positioning styles
 * @note Adds placeholder widgets for absolute positioned images
 * @note Handles float left/right and center alignment
 */
const getImagePositionDecorations = (state, view) => {
  let decorations = [];
  state.doc.descendants((node, pos) => {
    if (node.attrs.anchorData) {
      let style = '';
      let className = '';
      const { vRelativeFrom, alignH } = node.attrs.anchorData;
      const { size, padding, marginOffset } = node.attrs;
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
        const topPos =
          marginOffset.top !== undefined ? marginOffset.top : pageBreak?.offsetTop + pageBreak?.offsetHeight;
        style += vRelativeFrom === 'margin' ? `position: absolute; top: ${topPos}px; ` : '';
        if (vRelativeFrom === 'margin') {
          const nextPos = view.posAtDOM(pageBreak, 1);

          if (nextPos < 0) {
            const $pos = view.state.doc.resolve(pos);
            // When no placeholder can be added apply height to the parent node to occupy absolute image size
            decorations.push(
              Decoration.node(pos - 1, pos + $pos.parent.nodeSize - 1, {
                style: `height: ${size.height + parseInt(padding.top) + parseInt(padding.bottom)}px`,
              }),
            );
          }

          const imageBlock = document.createElement('div');
          imageBlock.className = 'anchor-image-placeholder';
          imageBlock.style.float = alignH;
          imageBlock.style.width = size.width + parseInt(padding[alignH]) + 'px';
          imageBlock.style.height = size.height + parseInt(padding.top) + parseInt(padding.bottom) + 'px';
          decorations.push(Decoration.widget(nextPos, imageBlock, { key: 'stable-key' }));
        }
      }

      decorations.push(Decoration.inline(pos, pos + node.nodeSize, { style, class: className }));
    }
  });
  return decorations;
};

/**
 * Find the previous DOM node with a specific class by walking up the DOM tree
 * @private
 * @param {Object} view - Editor view
 * @param {number} pos - Position in document
 * @param {string} className - Class name to search for
 * @returns {HTMLElement|null} DOM element with the class or null
 * @example
 * const pageBreak = findPreviousDomNodeWithClass(view, pos, 'pagination-break-wrapper');
 * @note Walks backward through siblings and ancestors
 * @note Handles text nodes by starting from their parent
 */
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
