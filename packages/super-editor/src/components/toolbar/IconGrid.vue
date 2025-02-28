<script setup>
import IconGridRow from './IconGridRow.vue';

const emit = defineEmits(['select', 'clickoutside']);
const props = defineProps({
  icons: {
    type: Array,
    required: true,
  },
  customIcons: {
    type: Array,
    required: false,
  },
  activeColor: {
    type: Object,
    required: false,
  },
});

const handleSelect = (option) => {
  emit('select', option);
};

</script>

<template>
  <div class="option-grid-ctn">
    <IconGridRow 
      :icons="icons"
      :active-color="activeColor"
      @select="handleSelect"
    />
    
    <template v-if="customIcons.flat().length">
      <span class="option-grid-ctn__subtitle">Custom colors</span>
      
      <IconGridRow
        :icons="customIcons"
        :active-color="activeColor"
        @select="handleSelect"
      />
    </template>
  </div>
</template>

<style scoped>
.option-grid-ctn {
  display: flex;
  flex-direction: column;
  padding: 5px;
  border-radius: 5px;
  background-color: #fff;
  z-index: 3;
  box-sizing: border-box;
  &__subtitle {
    padding: 3px;
    font-size: 12px;
    font-weight: 600;

  }
}

.option-grid-ctn :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
  fill: currentColor;
}
</style>
