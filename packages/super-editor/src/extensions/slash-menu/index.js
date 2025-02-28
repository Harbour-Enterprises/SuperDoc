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
            selected: null,
            filter: '',
            items: defaultItems,
            anchorPos: null,
            menuPosition: null,
          };
        },

        apply(tr, value) {
          const meta = tr.getMeta(SlashMenuPluginKey);

          if (meta?.type === 'open') {
            const pos = getCursorPositionRelativeToContainer(editor.view);
            const menuPosition = {
              left: `${pos.left + 100}px`,
              top: `${pos.top + 28}px`,
            };

            return {
              ...value,
              open: true,
              anchorPos: meta.pos,
              items: defaultItems,
              filter: '',
              selected: defaultItems[0]?.id || null,
              menuPosition,
            };
          }

          if (meta?.type === 'updatePosition' && value.anchorPos !== null) {
            const start = getCursorPositionRelativeToContainer(editor.view);
            return {
              ...value,
              menuPosition: {
                left: `${start.left}px`,
                top: `${start.bottom + 8}px`,
              },
            };
          }

          if (meta?.type === 'select') {
            return {
              ...value,
              selected: meta.id,
            };
          }

          // Handle filter updates
          if (meta?.type === 'filter') {
            const filtered = defaultItems.filter((item) =>
              item.label.toLowerCase().includes(meta.filter.toLowerCase()),
            );
            return {
              ...value,
              filter: meta.filter,
              items: filtered,
              selected: filtered[0]?.id || null, // Select first filtered item
            };
          }

          if (meta?.type === 'close') {
            return {
              ...value,
              open: false,
              anchorPos: null,
            };
          }

          return value;
        },
      },

      view(editorView) {
        const updatePosition = () => {
          // Use SlashMenuPluginKey.getState instead of plugin.getState
          if (SlashMenuPluginKey.getState(editorView.state).open) {
            editorView.dispatch(
              editorView.state.tr.setMeta(SlashMenuPluginKey, {
                type: 'updatePosition',
              }),
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
            // Only trigger in empty paragraphs or after space
            const { $cursor } = view.state.selection;
            if (!$cursor) return false;

            // Check if we're in a paragraph
            const isParagraph = $cursor.parent.type.name === 'paragraph';
            if (!isParagraph) return false;

            // Check if we're at the start of a paragraph or after a space
            const textBefore = $cursor.parent.textContent.slice(0, $cursor.parentOffset);
            const isEmptyOrAfterSpace = !textBefore || textBefore.endsWith(' ');
            if (!isEmptyOrAfterSpace) return false;

            // Prevent '/' insertion and open menu
            event.preventDefault();

            // Open the menu
            console.log('State before opening menu', view.state);
            view.dispatch(
              view.state.tr.setMeta(SlashMenuPluginKey, {
                type: 'open',
                pos: $cursor.pos,
              }),
            );

            console.log('State after opening menu', view.state);

            return true;
          }

          if (pluginState.open && (event.key === 'Escape' || event.key === 'ArrowLeft')) {
            view.dispatch(
              view.state.tr.setMeta(SlashMenuPluginKey, {
                type: 'close',
              }),
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
