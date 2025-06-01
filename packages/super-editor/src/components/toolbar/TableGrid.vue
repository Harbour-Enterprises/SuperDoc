<script setup>
import { ref } from 'vue';

const emit = defineEmits(['select', 'clickoutside']);

const selectedRows = ref(0);
const selectedCols = ref(0);

const onTableGridMouseOver = (event) => {
  let target = event.target;
  let isGrid = !!target.dataset.grid;

  if (isGrid) {
    return;
  }

  let grid = target.parentElement;
  let allItems = [...grid.querySelectorAll('[data-item]')];

  let cols = parseInt(target.dataset.cols, 10);
  let rows = parseInt(target.dataset.rows, 10);

  selectedCols.value = cols;
  selectedRows.value = rows;

  for (let i = 0; i < allItems.length; i++) {
    let item = allItems[i];
    let itemsCols = parseInt(item.dataset.cols, 10);
    let itemsRows = parseInt(item.dataset.rows, 10);

    if (itemsCols <= cols && itemsRows <= rows) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  }
};

const handleClick = ({ cols, rows }) => {
  emit('select', { cols, rows });
};
</script>

<template>
  <div class="toolbar-table-grid-wrapper">
    <div class="toolbar-table-grid" @mouseover="onTableGridMouseOver" data-grid="true">
      <template v-for="i in 5" :key="i">
        <div
          class="toolbar-table-grid__item"
          v-for="n in 5"
          :key="`${i}_${n}`"
          :data-cols="n"
          :data-rows="i"
          data-item="true"
          @click.stop.prevent="handleClick({ cols: n, rows: i })"
        ></div>
      </template>
    </div>

    <div class="toolbar-table-grid-value">{{ selectedRows }} x {{ selectedCols }}</div>
  </div>
</template>

<style scoped>
.toolbar-table-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2px;
  padding: 8px;
  box-sizing: border-box;
}

.toolbar-table-grid__item {
  width: 20px;
  height: 20px;
  border: 1px solid #d3d3d3;
  cursor: pointer;
  transition: all 0.15s;
}

.toolbar-table-grid__item.selected {
  background-color: #dbdbdb;
}

.toolbar-table-grid-value {
  font-size: 13px;
  line-height: 1.1;
  padding: 0px 8px 2px;
}
</style>
