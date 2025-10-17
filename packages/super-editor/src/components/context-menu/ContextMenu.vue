<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed, markRaw } from 'vue';
// Import backward-compatible key to avoid breaking old mocks/usages
import { ContextMenuPluginKey, SlashMenuPluginKey } from '../../extensions/context-menu/context-menu.js';
import { getPropsByItemId } from '../slash-menu/utils.js';
import { shouldBypassContextMenu } from '../../utils/contextmenu-helpers.js';
import { moveCursorToMouseEvent } from '../cursor-helpers.js';
import { getItems } from '../slash-menu/menuItems.js';
import { getEditorContext } from '../slash-menu/utils.js';

const props = defineProps({
  editor: { type: Object, required: true },
  openPopover: { type: Function, required: true },
  closePopover: { type: Function, required: true },
});

const searchInput = ref(null);
const searchQuery = ref('');
const isOpen = ref(false);
const menuPosition = ref({ left: '0px', top: '0px' });
const menuRef = ref(null);
const sections = ref([]);
const selectedId = ref(null);
const currentContext = ref(null);

const flattenedItems = computed(() => {
  const items = [];
  sections.value.forEach((section) => {
    section.items.forEach((item) => items.push(item));
  });
  return items;
});

const filteredItems = computed(() => {
  if (!searchQuery.value) return flattenedItems.value;
  return flattenedItems.value.filter((item) => item.label?.toLowerCase().includes(searchQuery.value.toLowerCase()));
});

const filteredSections = computed(() => {
  if (!searchQuery.value) return sections.value;
  return [{ id: 'search-results', items: filteredItems.value }];
});

watch(isOpen, (open) => {
  if (open) {
    nextTick(() => searchInput.value && searchInput.value.focus());
  }
});

watch(flattenedItems, (newItems) => {
  if (newItems.length > 0) selectedId.value = newItems[0].id;
});

const customItemRefs = new Map();
const setCustomItemRef = (el, item) => {
  if (el) {
    customItemRefs.set(item.id, { element: el, item });
    nextTick(() => renderCustomItem(item.id));
  }
};

const defaultRender = (context) => {
  const item = context.item || context.currentItem;
  const container = document.createElement('div');
  container.className = 'context-menu-default-content slash-menu-default-content';
  if (item.icon) {
    const iconSpan = document.createElement('span');
    iconSpan.className = 'context-menu-item-icon slash-menu-item-icon';
    iconSpan.innerHTML = item.icon;
    container.appendChild(iconSpan);
  }
  const labelSpan = document.createElement('span');
  labelSpan.textContent = item.label;
  container.appendChild(labelSpan);
  return container;
};

const renderCustomItem = async (itemId) => {
  const refData = customItemRefs.get(itemId);
  if (!refData || refData.element.hasCustomContent) return;
  const { element, item } = refData;
  try {
    if (!currentContext.value) currentContext.value = await getEditorContext(props.editor);
    const contextWithItem = { ...currentContext.value, currentItem: item };
    const renderFunction = item.render || defaultRender;
    const customElement = renderFunction(contextWithItem);
    if (customElement instanceof HTMLElement) {
      element.innerHTML = '';
      element.appendChild(customElement);
      element.hasCustomContent = true;
    }
  } catch (error) {
    console.warn('[ContextMenu] Error rendering custom item', itemId, error);
    const fallbackElement = defaultRender({ ...(currentContext.value || {}), currentItem: item });
    element.innerHTML = '';
    element.appendChild(fallbackElement);
    element.hasCustomContent = true;
  }
};

const cleanupCustomItems = () => {
  customItemRefs.forEach((refData) => {
    if (refData.element) refData.element.hasCustomContent = false;
  });
  customItemRefs.clear();
};

const handleGlobalKeyDown = (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    closeMenu();
    props.editor?.view?.focus();
    return;
  }
  if (isOpen.value && (event.target === searchInput.value || (menuRef.value && menuRef.value.contains(event.target)))) {
    const currentItems = filteredItems.value;
    const currentIndex = currentItems.findIndex((item) => item.id === selectedId.value);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex < currentItems.length - 1) selectedId.value = currentItems[currentIndex + 1].id;
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex > 0) selectedId.value = currentItems[currentIndex - 1].id;
        break;
      case 'Enter':
        event.preventDefault();
        const selectedItem = currentItems.find((item) => item.id === selectedId.value);
        if (selectedItem) executeCommand(selectedItem);
        break;
    }
  }
};

const handleGlobalOutsideClick = (event) => {
  if (isOpen.value && menuRef.value && !menuRef.value.contains(event.target)) {
    moveCursorToMouseEvent(event, props.editor);
    closeMenu({ restoreCursor: false });
  }
};

const handleRightClick = async (event) => {
  const readOnly = !props.editor?.isEditable;
  if (readOnly || shouldBypassContextMenu(event)) return;
  event.preventDefault();
  const context = await getEditorContext(props.editor, event);
  currentContext.value = context;
  sections.value = getItems({ ...context, trigger: 'click' });
  selectedId.value = flattenedItems.value[0]?.id || null;
  searchQuery.value = '';
  props.editor.view.dispatch(
    props.editor.view.state.tr.setMeta(ContextMenuPluginKey || SlashMenuPluginKey, {
      type: 'open',
      pos: context?.pos ?? props.editor.view.state.selection.from,
      clientX: event.clientX,
      clientY: event.clientY,
    }),
  );
};

const executeCommand = async (item) => {
  if (!props.editor) return;
  item.action ? await item.action(props.editor, currentContext.value) : null;
  if (item.component) {
    const componentProps = getPropsByItemId(item.id, props);
    props.openPopover(markRaw(item.component), componentProps, {
      left: menuPosition.value.left,
      top: menuPosition.value.top,
    });
    closeMenu({ restoreCursor: false });
  } else {
    const shouldRestoreCursor = item.id !== 'paste';
    closeMenu({ restoreCursor: shouldRestoreCursor });
  }
};

const closeMenu = (options = { restoreCursor: true }) => {
  if (!props.editor?.view) return;
  const pluginState = (ContextMenuPluginKey || SlashMenuPluginKey).getState(props.editor.view.state);
  const anchorPos = pluginState?.anchorPos;
  props.editor.view.dispatch(
    props.editor.view.state.tr.setMeta(ContextMenuPluginKey || SlashMenuPluginKey, { type: 'close' }),
  );
  if (options.restoreCursor && anchorPos !== null) {
    const tr = props.editor.view.state.tr.setSelection(
      props.editor.view.state.selection.constructor.near(props.editor.view.state.doc.resolve(anchorPos)),
    );
    props.editor.view.dispatch(tr);
    props.editor.view.focus();
  }
  cleanupCustomItems();
  currentContext.value = null;
  isOpen.value = false;
  searchQuery.value = '';
  sections.value = [];
};

onMounted(() => {
  if (!props.editor) return;
  document.addEventListener('keydown', handleGlobalKeyDown);
  document.addEventListener('mousedown', handleGlobalOutsideClick);
  props.editor.on('update', () => {
    if (!props.editor?.isEditable && isOpen.value) closeMenu({ restoreCursor: false });
  });
  props.editor.on('slashMenu:open', async (event) => {
    const readOnly = !props.editor?.isEditable;
    if (readOnly) return;
    isOpen.value = true;
    menuPosition.value = event.menuPosition;
    searchQuery.value = '';
    if (!currentContext.value) {
      const context = await getEditorContext(props.editor);
      currentContext.value = context;
      sections.value = getItems({ ...context, trigger: 'slash' });
      selectedId.value = flattenedItems.value[0]?.id || null;
    } else if (sections.value.length === 0) {
      const trigger = currentContext.value.event?.type === 'contextmenu' ? 'click' : 'slash';
      sections.value = getItems({ ...currentContext.value, trigger });
      selectedId.value = flattenedItems.value[0]?.id || null;
    }
  });
  props.editor.view.dom.addEventListener('contextmenu', handleRightClick);
  props.editor.on('slashMenu:close', () => {
    cleanupCustomItems();
    isOpen.value = false;
    searchQuery.value = '';
    currentContext.value = null;
  });
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleGlobalKeyDown);
  document.removeEventListener('mousedown', handleGlobalOutsideClick);
  cleanupCustomItems();
  if (props.editor) {
    try {
      props.editor.off('slashMenu:open');
      props.editor.off('slashMenu:close');
      props.editor.off('update');
      props.editor.view.dom.removeEventListener('contextmenu', handleRightClick);
    } catch (e) {}
  }
});
</script>

<template>
  <div v-if="isOpen" ref="menuRef" class="context-menu slash-menu" :style="menuPosition" @mousedown.stop>
    <input
      ref="searchInput"
      v-model="searchQuery"
      type="text"
      class="context-menu-hidden-input slash-menu-hidden-input"
      @keydown="handleGlobalKeyDown"
      @keydown.stop
    />
    <div class="context-menu-items slash-menu-items">
      <template v-for="(section, sectionIndex) in filteredSections" :key="section.id">
        <div v-if="sectionIndex > 0 && section.items.length > 0" class="context-menu-divider slash-menu-divider" tabindex="0"></div>
        <template v-for="item in section.items" :key="item.id">
          <div class="context-menu-item slash-menu-item" :class="{ 'is-selected': item.id === selectedId }" @click="executeCommand(item)">
            <div :ref="(el) => setCustomItemRef(el, item)" class="context-menu-custom-item slash-menu-custom-item">
              <template v-if="!item.render">
                <span v-if="item.icon" class="context-menu-item-icon slash-menu-item-icon" v-html="item.icon"></span>
                <span>{{ item.label }}</span>
              </template>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<style>
/* Use aliases already defined in SlashMenu.vue through shared class names */
</style>
