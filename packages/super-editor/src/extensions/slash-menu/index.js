import { Plugin, PluginKey } from 'prosemirror-state';
import { Extension } from '@core/Extension.js';

// Utility to move later
function getCursorPositionRelativeToContainer(view) {
  const { state, dom } = view;
  const { selection } = state;

  if (selection.empty) {
    // Get the coordinates of the cursor in the viewport
    const cursorCoords = view.coordsAtPos(selection.from);
    console.log('cursorCoords', cursorCoords);
    // Get the bounding rectangle of the ProseMirror container
    const containerRect = dom.getBoundingClientRect();
    console.log('containerRect', containerRect);
    // Calculate the position relative to the container
    const relativeX = cursorCoords.left - containerRect.left;
    const relativeY = cursorCoords.top - containerRect.top;

    return { left: relativeX, top: relativeY };
  } else {
    console.warn('Selection is not empty, no single cursor position available.');
    return null;
  }
}

export const SlashMenuPluginKey = new PluginKey('slashMenu');

// Define default menu items
const defaultItems = [
  {
    id: 'insert-text',
    label: 'Insert Text',
    icon: 'fas fa-wand-magic-sparkles',
  },
  // {
  //   id: 'table',
  //   label: 'Insert Table',
  //   // group: 'Table',
  //   command: (view) => {
  //     console.log('Table command executed');
  //     window.alert('Table command executed');
  //   },
  // },
  // {
  //   id: 'image',
  //   label: 'Insert Image',
  //   // group: 'Test',
  //   command: (view) => {
  //     console.log('Image command executed');
  //     window.alert('Image command executed');
  //   },
  // },
  // Add more items as needed
];

export const SlashMenu = Extension.create({
  name: 'slashMenu',

  addPmPlugins() {
    const editor = this.editor;

    const slashMenuPlugin = new Plugin({
      key: SlashMenuPluginKey,

      state: {
        init() {
          return {
            open: false,
            selected: defaultItems[0]?.id || null,
            items: defaultItems,
            anchorPos: null,
            menuPosition: null,
          };
        },

        apply(tr, value) {
          const meta = tr.getMeta(SlashMenuPluginKey);
          if (!meta) return value;

          // Handle state updates
          switch (meta.type) {
            case 'open': {
              const pos = getCursorPositionRelativeToContainer(editor.view);
              const menuPosition = {
                left: `${pos.left + 100}px`,
                top: `${pos.top + 28}px`,
              };

              // Update state
              const newState = {
                ...value,
                open: true,
                anchorPos: meta.pos,
                menuPosition,
                items: defaultItems,
                selected: defaultItems[0]?.id,
              };

              // Emit event after state update
              editor.emit('slashMenu:open', {
                items: defaultItems,
                menuPosition,
                anchorPos: meta.pos,
              });

              return newState;
            }

            case 'updatePosition': {
              const start = getCursorPositionRelativeToContainer(editor.view);
              const menuPosition = {
                left: `${start.left}px`,
                top: `${start.bottom + 8}px`,
              };

              // Update state
              const newState = { ...value, menuPosition };
              
              // Emit event after state update
              editor.emit('slashMenu:position', { menuPosition });
              
              return newState;
            }

            case 'select': {
              // Update state
              const newState = { ...value, selected: meta.id };
              
              // Emit event after state update
              editor.emit('slashMenu:select', { id: meta.id });
              
              return newState;
            }

            case 'filter': {
              const filtered = defaultItems.filter((item) =>
                item.label.toLowerCase().includes(meta.filter.toLowerCase())
              );

              // Update state
              const newState = {
                ...value,
                items: filtered,
                selected: filtered[0]?.id,
              };

              // Emit event after state update
              editor.emit('slashMenu:filter', {
                filter: meta.filter,
                items: filtered,
              });

              return newState;
            }

            case 'close': {
              // Update state
              const newState = {
                ...value,
                open: false,
                anchorPos: null,
              };

              // Emit event after state update
              editor.emit('slashMenu:close');

              return newState;
            }

            default:
              return value;
          }
        },
      },

      view(editorView) {
        const updatePosition = () => {
          const state = SlashMenuPluginKey.getState(editorView.state);
          if (state.open) {
            editorView.dispatch(
              editorView.state.tr.setMeta(SlashMenuPluginKey, {
                type: 'updatePosition',
              })
            );
          }
        };

        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return {
          destroy() {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
          },
        };
      },

      props: {
        handleKeyDown(view, event) {
          const pluginState = this.getState(view.state);

          if (event.key === '/' && !pluginState.open) {
            const { $cursor } = view.state.selection;
            if (!$cursor) return false;

            const isParagraph = $cursor.parent.type.name === 'paragraph';
            if (!isParagraph) return false;

            const textBefore = $cursor.parent.textContent.slice(0, $cursor.parentOffset);
            const isEmptyOrAfterSpace = !textBefore || textBefore.endsWith(' ');
            if (!isEmptyOrAfterSpace) return false;

            event.preventDefault();

            // Only dispatch state update - event will be emitted in apply()
            view.dispatch(
              view.state.tr.setMeta(SlashMenuPluginKey, {
                type: 'open',
                pos: $cursor.pos,
              })
            );
            return true;
          }

          if (pluginState.open && (event.key === 'Escape' || event.key === 'ArrowLeft')) {
            // Only dispatch state update - event will be emitted in apply()
            view.dispatch(
              view.state.tr.setMeta(SlashMenuPluginKey, {
                type: 'close',
              })
            );
            return true;
          }

          return false;
        },
      },
    });

    return [slashMenuPlugin];
  },
});
