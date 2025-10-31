// @ts-check
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { PaginationPluginKey } from '../../pagination/pagination.js';

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
        if (!tr.docChanged && !shouldUpdate) return oldDecorationSet;
        const decorations = getImagePositionDecorations(newState, view);
        shouldUpdate = false;
        return DecorationSet.create(newState.doc, decorations);
      },
    },

    view: () => {
      return {
        update: (view, lastState) => {
          const pagination = PaginationPluginKey.getState(lastState);
          if (shouldUpdate) {
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
      const { size, padding } = node.attrs;
      const pageBreak = findPreviousDomNodeWithClass(view, pos, 'pagination-break-wrapper');
      if (pageBreak && vRelativeFrom === 'margin' && alignH) {
        const topPos = pageBreak?.offsetTop + pageBreak?.offsetHeight;
        let horizontalAlignment = `${alignH}: 0;`;
        if (alignH === 'center') horizontalAlignment = 'left: 50%; transform: translateX(-50%);';

        style += vRelativeFrom === 'margin' ? `position: absolute; top: ${topPos}px; ${horizontalAlignment}` : '';
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
        imageBlock.style.float = alignH === 'left' || alignH === 'right' ? alignH : 'none';
        let paddingHorizontal;
        if (alignH === 'center') {
          paddingHorizontal = (parseInt(padding.left) || 0) + (parseInt(padding.right) || 0);
        } else {
          paddingHorizontal = parseInt(padding[alignH]) || 0;
        }
        imageBlock.style.width = size.width + paddingHorizontal + 'px';
        imageBlock.style.height = size.height + parseInt(padding.top) + parseInt(padding.bottom) + 'px';
        decorations.push(Decoration.widget(nextPos, imageBlock, { key: 'stable-key' }));

        decorations.push(Decoration.inline(pos, pos + node.nodeSize, { style, class: className }));
      }
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
