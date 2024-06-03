import './style.css';
import EventEmitter from 'eventemitter3'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useSuperdocStore } from './stores/superdoc-store';
import clickOutside from '@/helpers/v-click-outside';


const createMyApp = () => {
  const app = createApp(App);
  const pinia = createPinia()
  app.use(pinia)
  app.directive('click-outside', clickOutside);

  const superdocStore = useSuperdocStore();
  return { app, pinia, superdocStore };
}

/* **
  * Superdoc class
  * Expects a config object
*/
export default class Superdoc extends EventEmitter {
  constructor(config) {
    super();
    const { app, pinia, superdocStore } = createMyApp(this);
    this.app = app;
    this.pinia = pinia;
    this.app.config.globalProperties.$config = config;
    this.app.config.globalProperties.$superdoc = this;

    superdocStore.init(config);

    // Directives
    this.app.mount(config.selector);
  }

  broadcastComments(type, data) {
    console.debug('[comments] Broadcasting:', type, data);
    this.emit('comments-update', type, data);
  }

  destroy() {
    if (this.app) {
      this.app.unmount();
    }

    // Remove global properties
    delete this.app.config.globalProperties.$config;
    delete this.app.config.globalProperties.$superdoc;
  }
}
