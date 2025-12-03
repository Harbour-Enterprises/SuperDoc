import { createApp, type App as VueApp } from 'vue';
import { createPinia, type Pinia } from 'pinia';

import { vClickOutside } from '@superdoc/common';
import { useSuperdocStore } from '../stores/superdoc-store';
import { useCommentsStore } from '../stores/comments-store';
import SuperDocApp from '../SuperDoc.vue';
import { useHighContrastMode, type UseHighContrastModeReturn } from '../composables/use-high-contrast-mode';

/**
 * Return type for createSuperdocVueApp function
 */
export interface CreateSuperdocVueAppReturn {
  /** The Vue application instance */
  app: VueApp;
  /** The Pinia store instance */
  pinia: Pinia;
  /** The superdoc store */
  superdocStore: ReturnType<typeof useSuperdocStore>;
  /** The comments store */
  commentsStore: ReturnType<typeof useCommentsStore>;
  /** The high contrast mode store */
  highContrastModeStore: UseHighContrastModeReturn;
}

/**
 * Generate the superdoc Vue app
 *
 * Creates and configures the Vue application instance with Pinia for state management,
 * registers custom directives, and initializes all required stores.
 *
 * @returns An object containing the Vue app, the Pinia reference, and all initialized stores
 *
 * @example
 * const { app, pinia, superdocStore, commentsStore } = createSuperdocVueApp();
 * app.mount('#app');
 */
export const createSuperdocVueApp = (): CreateSuperdocVueAppReturn => {
  const app = createApp(SuperDocApp);
  const pinia = createPinia();
  app.use(pinia);
  app.directive('click-outside', vClickOutside);

  const superdocStore = useSuperdocStore();
  const commentsStore = useCommentsStore();
  const highContrastModeStore = useHighContrastMode();

  return { app, pinia, superdocStore, commentsStore, highContrastModeStore };
};
