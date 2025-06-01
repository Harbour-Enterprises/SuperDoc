import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

/**
 * Plugin key for the image resize plugin
 */
export const ImageResizePluginKey = new PluginKey('imageResize');

/**
 * Plugin for handling image resizing functionality
 *
 * @returns {Plugin} ProseMirror plugin for image resizing
 */
export const ImageResizePlugin = () => {
  // Track the resize state
  let resizeState = {
    dragging: false,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    handle: null,
    imagePos: null,
    imageNode: null,
    imageElement: null,
    aspectRatio: 1,
  };

  // Store references to resize handles container and editor view
  let resizeContainer = null;
  let editorView = null;
  let globalClickHandler = null;
  let globalMousedownHandler = null;

  return new Plugin({
    key: ImageResizePluginKey,

    state: {
      init() {
        return DecorationSet.empty;
      },

      apply(tr, oldState, _, newState) {
        // Skip if the transaction is from this plugin
        if (tr.getMeta(ImageResizePluginKey)) {
          return oldState;
        }

        const decorations = [];
        const { selection } = newState;

        // Only create decoration if an image node is selected
        if (selection.node && selection.node.type.name === 'image') {
          decorations.push(
            Decoration.node(selection.from, selection.to, {
              nodeName: 'span',
              class: 'resizable-image-wrapper image-selected',
              'data-image-pos': selection.from,
            }),
          );
        }

        return DecorationSet.create(newState.doc, decorations);
      },
    },

    props: {
      decorations(state) {
        return this.getState(state);
      },
    },

    view(view) {
      editorView = view;

      // Add global click handler
      globalClickHandler = (event) => {
        if (!event.target.closest('.resizable-image-wrapper') && !event.target.closest('.image-resize-container')) {
          hideResizeHandles();
        }
      };

      document.addEventListener('click', globalClickHandler);

      // Add global mousedown handler
      globalMousedownHandler = (event) => {
        if (event.target.closest('.resize-handle')) {
          event.preventDefault();
          event.stopPropagation();
          startResize(editorView, event, event.target);
          return true;
        }
      };

      document.addEventListener('mousedown', globalMousedownHandler);

      return {
        update(view, prevState) {
          // Show/hide resize handles based on selection changes
          const { selection } = view.state;
          const prevSelection = prevState.selection;

          if (selection.from !== prevSelection.from || selection.to !== prevSelection.to) {
            setTimeout(() => {
              const selectedImageWrapper = document.querySelector('.resizable-image-wrapper.image-selected');
              console.log({ selectedImageWrapper });
              if (selectedImageWrapper) {
                const img = selectedImageWrapper.querySelector('img');
                console.log({ img });
                if (img) {
                  showResizeHandles(view, img);
                } else {
                  hideResizeHandles();
                }
              } else {
                hideResizeHandles();
              }
            }, 10);
          }
        },

        destroy() {
          hideResizeHandles();
          cleanupEventListeners();
          if (globalClickHandler) {
            document.removeEventListener('click', globalClickHandler);
            globalClickHandler = null;
          }
          if (globalMousedownHandler) {
            document.removeEventListener('mousedown', globalMousedownHandler);
            globalMousedownHandler = null;
          }
          editorView = null;
        },
      };
    },
  });

  function showResizeHandles(view, imageElement) {
    hideResizeHandles();

    const wrapper = imageElement.closest('.resizable-image-wrapper');
    if (!wrapper) return;

    const imagePos = Number.parseInt(wrapper.getAttribute('data-image-pos'), 10);
    const node = view.state.doc.nodeAt(imagePos);
    if (!node || node.type.name !== 'image') return;

    // Create resize container
    resizeContainer = document.createElement('div');
    resizeContainer.className = 'image-resize-container';
    resizeContainer.style.position = 'absolute';
    resizeContainer.style.pointerEvents = 'none';
    resizeContainer.style.zIndex = '1000';

    // Create handles
    const handles = ['nw', 'ne', 'sw', 'se'];
    for (const handle of handles) {
      const handleEl = document.createElement('div');
      handleEl.className = `resize-handle resize-handle-${handle}`;
      handleEl.setAttribute('data-handle', handle);
      handleEl.setAttribute('data-image-pos', imagePos);
      handleEl.style.pointerEvents = 'auto';
      resizeContainer.appendChild(handleEl);
    }

    // Position the container relative to the image
    document.body.appendChild(resizeContainer);
    updateHandlePositions(imageElement);
  }

  function hideResizeHandles() {
    if (resizeContainer?.parentNode) {
      resizeContainer.parentNode.removeChild(resizeContainer);
      resizeContainer = null;
    }
  }

  function updateHandlePositions(imageElement) {
    if (!resizeContainer || !imageElement) return;

    const rect = imageElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    resizeContainer.style.left = `${rect.left + scrollLeft}px`;
    resizeContainer.style.top = `${rect.top + scrollTop}px`;
    resizeContainer.style.width = `${rect.width}px`;
    resizeContainer.style.height = `${rect.height}px`;
  }

  function startResize(view, event, handleElement) {
    const handle = handleElement.getAttribute('data-handle');
    const imagePos = Number.parseInt(handleElement.getAttribute('data-image-pos'), 10);
    const node = view.state.doc.nodeAt(imagePos);

    if (!node || node.type.name !== 'image') return;

    const imageElement = view.nodeDOM(imagePos);

    if (!imageElement) return;

    const rect = imageElement.getBoundingClientRect();

    resizeState = {
      dragging: true,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      handle,
      imagePos,
      imageNode: node,
      imageElement,
      aspectRatio: rect.width / rect.height,
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = getResizeCursor(handle);
    document.body.style.userSelect = 'none';
  }

  function handleMouseMove(event) {
    if (!resizeState.dragging) return;

    event.preventDefault();
    event.stopPropagation();

    let deltaX = event.clientX - resizeState.startX;
    let deltaY = event.clientY - resizeState.startY;

    // Adjust delta based on handle position
    if (resizeState.handle.includes('w')) deltaX = -deltaX;
    if (resizeState.handle.includes('n')) deltaY = -deltaY;

    // Calculate new dimensions maintaining aspect ratio
    const newWidth = Math.max(20, resizeState.startWidth + deltaX);
    const newHeight = newWidth / resizeState.aspectRatio;

    // Apply the new size immediately for visual feedback
    if (resizeState.imageElement) {
      resizeState.imageElement.style.width = `${newWidth}px`;
      resizeState.imageElement.style.height = 'auto';

      // Update handle positions
      updateHandlePositions(resizeState.imageElement);
    }
  }

  function handleMouseUp(event) {
    if (!resizeState.dragging) return;

    cleanupEventListeners();

    let deltaX = event.clientX - resizeState.startX;
    let deltaY = event.clientY - resizeState.startY;

    // Adjust delta based on handle position
    if (resizeState.handle.includes('w')) deltaX = -deltaX;
    if (resizeState.handle.includes('n')) deltaY = -deltaY;

    // Calculate final dimensions
    const newWidth = Math.max(20, resizeState.startWidth + deltaX);
    const newHeight = newWidth / resizeState.aspectRatio;

    // Update the document
    if (editorView && resizeState.imagePos < editorView.state.doc.content.size) {
      const tr = editorView.state.tr;
      const node = tr.doc.nodeAt(resizeState.imagePos);

      if (node && node.type.name === 'image') {
        const attrs = {
          ...node.attrs,
          size: {
            ...node.attrs.size,
            width: Math.round(newWidth),
            height: Math.round(newHeight),
          },
        };

        tr.setNodeMarkup(resizeState.imagePos, null, attrs);
        tr.setMeta(ImageResizePluginKey, { action: 'resize' });
        editorView.dispatch(tr);
      }
    }

    // Reset resize state
    resizeState = {
      dragging: false,
      startX: 0,
      startY: 0,
      startWidth: 0,
      startHeight: 0,
      handle: null,
      imagePos: null,
      imageNode: null,
      imageElement: null,
      aspectRatio: 1,
    };
  }

  function cleanupEventListeners() {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  function getResizeCursor(handle) {
    switch (handle) {
      case 'nw':
      case 'se':
        return 'nwse-resize';
      case 'ne':
      case 'sw':
        return 'nesw-resize';
      default:
        return 'default';
    }
  }
};
