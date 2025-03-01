<script>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import AIWriter from '../toolbar/AIWriter.vue';
import { SlashMenuPluginKey } from '@/extensions/slash-menu';
export default {
  name: 'SlashMenu',

  props: {
    editor: {
      type: Object,
      required: true,
    },
  },

  setup(props) {
    const menuRef = ref(null);
    const searchInput = ref(null);
    const searchQuery = ref('');
    
    // Replace computed properties with refs
    const isOpen = ref(false);
    const selectedId = ref(null);
    const items = ref([]);
    const menuPosition = ref({ left: '0px', top: '0px' });

    // Watch for isOpen changes to focus input
    watch(isOpen, (open) => {
      if (open) {
        // Use nextTick to ensure DOM is updated
        nextTick(() => {
          if (searchInput.value) {
            searchInput.value.focus();
          }
        });
      }
    });

    // Event listeners
    onMounted(() => {
      if (!props.editor) return;

      props.editor.on('slashMenu:open', ({ items: menuItems, menuPosition: position }) => {
        // State is handled by plugin, update refs
        isOpen.value = true;
        items.value = menuItems;
        menuPosition.value = position;
      });

      props.editor.on('slashMenu:position', ({ menuPosition: position }) => {
        console.log('Slash menu position updated', position);
      });

      props.editor.on('slashMenu:select', ({ id }) => {
        console.log('Slash menu item selected', id);
      });

      props.editor.on('slashMenu:filter', ({ items: filteredItems }) => {
        console.log('Slash menu items filtered', filteredItems);
      });

      props.editor.on('slashMenu:close', () => {
        // Handle the close of the menu
        searchQuery.value = '';
        isOpen.value = false;
      });

      props.editor.on('slashMenu:keydown', ({ type, pos }) => {
        console.log('Slash menu keydown', { type, pos });
      });
    });

    onBeforeUnmount(() => {
      // Clean up event listeners
      if (props.editor) {
        props.editor.off('slashMenu:open');
        props.editor.off('slashMenu:position');
        props.editor.off('slashMenu:select');
        props.editor.off('slashMenu:filter');
        props.editor.off('slashMenu:close');
        props.editor.off('slashMenu:keydown');
      }
    });

    const executeCommand = (item) => {
      console.log('executeCommand', item);  
      if (props.editor?.view) {
        if (item.id === 'insert-text') {
          // Get selected text
          const { state } = props.editor.view;
          const { from, to, empty } = state.selection;
          const selectedText = !empty ? state.doc.textBetween(from, to) : '';

          // Create AI Writer popover
          const aiPopover = document.createElement('div');
          aiPopover.className = 'ai-popover';

          // Position the popover near the slash menu
          const menuElement = menuRef.value;
          if (menuElement) {
            const menuRect = menuElement.getBoundingClientRect();
            aiPopover.style.position = 'absolute';
            aiPopover.style.left = `${menuRect.left}px`;
            aiPopover.style.top = `${menuRect.top}px`;
          }

          // Mount AI Writer component
          const aiWriter = h(AIWriter, {
            selectedText,
            handleClose: () => {
              // Safely remove the popover if it exists
              if (aiPopover.parentNode) {
                aiPopover.parentNode.removeChild(aiPopover);
              }
              props.editor.view.focus();
            },
            superToolbar: {
              activeEditor: props.editor,
            },
            aiModule: props.editor.options.aiModule,
          });

          // Render and append
          const app = createApp({
            render: () => aiWriter,
          });
          app.mount(aiPopover);
          document.body.appendChild(aiPopover);

          // Close slash menu
          props.editor.view.dispatch(
            props.editor.view.state.tr.setMeta(SlashMenuPluginKey, {
              type: 'close',
            }),
          );
        } else {
          // Handle other commands as before
          item.command(props.editor.view);
          props.editor.view.dispatch(
            props.editor.view.state.tr.setMeta(SlashMenuPluginKey, {
              type: 'close',
            }),
          );
        }
      }
    };

    // Handle keyboard navigation
    const handleKeyDown = (event) => {
      // Handle escape and space keys first
      if (event.key === 'Escape' || (event.key === ' ' && !searchQuery.value)) {
        event.preventDefault();
        props.editor.view.dispatch(
          props.editor.view.state.tr.setMeta(SlashMenuPluginKey, {
            type: 'close',
          }),
        );
        props.editor.view.focus();
        return;
      }

      const currentItems = items.value;
      const currentIndex = currentItems.findIndex((item) => item.id === selectedId.value);

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (currentIndex < currentItems.length - 1) {
            const nextItem = currentItems[currentIndex + 1];
            props.editor.view.dispatch(
              props.editor.view.state.tr.setMeta(SlashMenuPluginKey, {
                type: 'select',
                id: nextItem.id,
              }),
            );
          }
          break;

        case 'ArrowUp':
          event.preventDefault();
          if (currentIndex > 0) {
            const prevItem = currentItems[currentIndex - 1];
            props.editor.view.dispatch(
              props.editor.view.state.tr.setMeta(SlashMenuPluginKey, {
                type: 'select',
                id: prevItem.id,
              }),
            );
          }
          break;

        case 'Enter':
          event.preventDefault();
          const selectedItem = currentItems.find((item) => item.id === selectedId.value);
          if (selectedItem) {
            executeCommand(selectedItem);
          }
          break;
      }
    };

    // Add method to handle mouse hover selection
    const handleItemHover = (itemId) => {
      props.editor.view.dispatch(
        props.editor.view.state.tr.setMeta(SlashMenuPluginKey, {
          type: 'select',
          id: itemId,
        }),
      );
    };

    // Add new method to handle input blur
    const handleInputBlur = (event) => {
      // Prevent closing if clicking inside the menu
      if (menuRef.value?.contains(event.relatedTarget)) {
        return;
      }

      // Close menu when focus is lost
      if (props.editor?.view) {
        props.editor.view.dispatch(
          props.editor.view.state.tr.setMeta(SlashMenuPluginKey, {
            type: 'close',
          }),
        );
      }
    };

    return {
      menuRef,
      searchInput,
      searchQuery,
      menuPosition,
      isOpen,
      selectedId,
      items,
      handleKeyDown,
      handleInputBlur,
      handleItemHover,
      executeCommand,
    };
  },
};
</script>

<template>
  <div v-if="isOpen" ref="menuRef" class="slash-menu" :style="menuPosition">
    <!-- Hide the input visually but keep it focused for typing -->
    <input
      ref="searchInput"
      v-model="searchQuery"
      type="text"
      class="slash-menu-hidden-input"
      @keydown="handleKeyDown"
      @keydown.stop
      @blur="handleInputBlur"
    />

    <div class="slash-menu-items">
      <div
        v-for="item in items"
        :key="item.id"
        class="slash-menu-item"
        :class="{ 'is-selected': item.id === selectedId }"
        @click="executeCommand(item)"
        @mousemove="handleItemHover(item.id)"
      >
        <!-- Render the icon if it exists -->
        <i v-if="item.icon" :class="item.icon" class="slash-menu-item-icon"></i>
        {{ item.label }}
      </div>
    </div>
  </div>
</template>

<style>
.slash-menu {
  position: absolute;
  z-index: 50;
  width: 200px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05), 0px 10px 20px rgba(0, 0, 0, 0.1);
  padding: 0.5rem;
  margin-top: 0.5rem;
}

/* Hide the input but keep it functional */
.slash-menu-hidden-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  height: 0;
  width: 0;
  padding: 0;
  margin: 0;
  border: none;
}

.slash-menu-items {
  max-height: 300px;
  overflow-y: auto;
}

.slash-menu-search {
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
}

.slash-menu-search input {
  width: 100%;
  padding: 0.25rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  outline: none;
}

.slash-menu-search input:focus {
  border-color: #0096fd;
}

/* Remove unused group styles */
.slash-menu-group-label {
  display: none;
}

.slash-menu-item {
  padding: 0.5rem;
  margin: 0.25rem;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s ease;
}

.slash-menu-item:hover {
  background: #f5f5f5;
}

.slash-menu-item.is-selected {
  background: #edf6ff;
  color: #0096fd;
}

.slash-menu-item-icon {
  margin-right: 8px;
}

/* Add new styles for AI popover */
.ai-popover {
  z-index: 100;
  background: white;
  border-radius: 6px;
  box-shadow: 0 0 2px 2px #7715b366;
  border: 1px solid #7715b3;
  padding: 5px;
}
</style> 