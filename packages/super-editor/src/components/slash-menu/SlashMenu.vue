<script>
import { computed, ref, watch, h, createApp } from 'vue';
import { SlashMenuPluginKey } from '../../extensions/slash-menu';
import AIWriter from '../toolbar/AIWriter.vue';

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

    // Watch for editor changes instead of logging on setup
    watch(
      () => props.editor,
      (newEditor) => {
        if (newEditor) {
          console.log('SlashMenu Component - Editor initialized:', newEditor);
        }
      },
    );

    const pluginState = computed(() => {
      if (!props.editor?.state) {
        return null;
      }
      const state = SlashMenuPluginKey.getState(props.editor.state);
      if (state) {
        console.log('SlashMenu Component - Plugin state:', state);
      }
      return state;
    });

    const isOpen = computed(() => {
      const open = Boolean(pluginState.value?.open);
      console.log('SlashMenu Component - Menu open state:', open);
      return open;
    });

    const selectedId = computed(() => pluginState.value?.selected || null);

    const items = computed(() => pluginState.value?.filteredElements || pluginState.value?.items || []);

    const menuPosition = computed(() => pluginState.value?.menuPosition || { left: '0px', top: '0px' });

    // Update filtering logic
    watch(searchQuery, (query) => {
      if (props.editor?.view) {
        // Get current items from plugin state
        const currentState = SlashMenuPluginKey.getState(props.editor.state);
        const allItems = currentState?.items || [];

        // Check for matches before updating
        const matches = allItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));

        // Only update if we have matches or if query is empty
        if (matches.length > 0 || query === '') {
          props.editor.view.dispatch(
            props.editor.view.state.tr.setMeta(SlashMenuPluginKey, {
              type: 'filter',
              filter: query,
            }),
          );
        }
      }
    });

    const executeCommand = (item) => {
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

    watch([() => props.editor, isOpen], ([editor, open]) => {
      console.log('SlashMenu Component - Watch triggered:', { hasEditor: !!editor, isOpen: open });
      if (editor && open) {
        setTimeout(() => {
          if (searchInput.value) {
            searchInput.value.focus();
          }
        }, 0);
      }
    });

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