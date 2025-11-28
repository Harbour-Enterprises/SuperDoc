import { ref, type Ref } from 'vue';

const isHighContrastMode = ref<boolean>(false);

/**
 * Return type of the useHighContrastMode composable
 */
export interface UseHighContrastModeReturn {
  /** Whether high contrast mode is enabled */
  isHighContrastMode: Ref<boolean>;
  /** Set the high contrast mode value */
  setHighContrastMode: (value: boolean) => void;
}

/**
 * Vue composable for managing high contrast mode accessibility state
 *
 * This composable provides a global state for high contrast mode that can be
 * used across the application to adjust visual accessibility.
 *
 * @returns An object containing the high contrast mode state and setter
 *
 * @example
 * const { isHighContrastMode, setHighContrastMode } = useHighContrastMode();
 * setHighContrastMode(true);
 */
export function useHighContrastMode(): UseHighContrastModeReturn {
  const setHighContrastMode = (value: boolean): void => {
    isHighContrastMode.value = value;
  };

  return {
    isHighContrastMode,
    setHighContrastMode,
  };
}
