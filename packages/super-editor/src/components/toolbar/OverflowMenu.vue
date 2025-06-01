<script setup>
import { getCurrentInstance, ref, computed } from 'vue';
import ToolbarButton from './ToolbarButton.vue';
import ButtonGroup from './ButtonGroup.vue';

const { proxy } = getCurrentInstance();

const props = defineProps({
  toolbarItem: {
    type: Object,
    required: true,
  },
  overflowItems: {
    type: Array,
    required: true,
  },
});

const isDropdownOpened = ref(false);

const overflowToolbarItem = computed(() => ({
  ...props.toolbarItem,
  active: isDropdownOpened,
}));

const toggleOverflowMenu = () => {
  isDropdownOpened.value = !isDropdownOpened.value;
};

const handleCommand = ({ item, argument }) => {
  proxy.$toolbar.emitCommand({ item, argument });
};
</script>

<template>
  <div class="overflow-menu">
    <div class="overflow-menu-trigger">
      <ToolbarButton :toolbar-item="overflowToolbarItem" @buttonClick="toggleOverflowMenu" />
    </div>
    <div v-if="isDropdownOpened" class="overflow-menu_items">
      <ButtonGroup :toolbar-items="overflowItems" @command="handleCommand" class="superdoc-toolbar-overflow" />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.overflow-menu {
  position: relative;
  &_items {
    position: absolute;
    width: 200px;
    top: calc(100% + 3px);
    right: 0;
    padding: 4px 8px;
    background-color: #fff;
    border-radius: 8px;
    z-index: 100;
    box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.25);
    box-sizing: border-box;
  }
}
.superdoc-toolbar-overflow {
  min-width: auto !important;
  max-width: 200px;
  flex-wrap: wrap;
}
@media (max-width: 300px) {
  .overflow-menu_items {
    right: auto;
    left: 0;
    transform: translateX(-50%);
  }
}
</style>
