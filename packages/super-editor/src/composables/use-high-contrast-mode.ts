import { ref } from 'vue';

const isHighContrastMode = ref(false);

export function useHighContrastMode() {
  const setHighContrastMode = (value: boolean): void => {
    isHighContrastMode.value = value;
  };

  return {
    isHighContrastMode,
    setHighContrastMode,
  };
}
