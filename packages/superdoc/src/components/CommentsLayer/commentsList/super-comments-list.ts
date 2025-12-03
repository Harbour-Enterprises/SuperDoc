import EventEmitter from 'eventemitter3';
import { createApp, type App, type ComponentPublicInstance } from 'vue';

import { vClickOutside } from '@superdoc/common';
import type { SuperDoc } from '../../../core/types';
import CommentsList from './commentsList.vue';

/**
 * Comments store interface (minimal definition)
 */
interface CommentsStore {
  /** Comments data */
  [key: string]: unknown;
}

/**
 * Configuration options for SuperComments
 */
export interface SuperCommentsConfig {
  /** Array of comments to display */
  comments?: unknown[];
  /** DOM element to mount the comments list */
  element?: HTMLElement | null;
  /** CSS selector for the element to mount to */
  selector?: string;
  /** Comments store instance */
  commentsStore?: CommentsStore | null;
}

/**
 * Comments list renderer (not floating comments)
 *
 * This renders a list of comments into an element, connected to main SuperDoc instance.
 * It creates a Vue application that displays comments in a sidebar or panel.
 *
 * @example
 * const commentsList = new SuperComments({
 *   element: document.getElementById('comments-panel'),
 *   comments: [],
 *   commentsStore: commentsStore
 * }, superdoc);
 *
 * // Later, to close
 * commentsList.close();
 */
export class SuperComments extends EventEmitter {
  /** DOM element where the comments list is mounted */
  element: HTMLElement | null;

  /** Configuration for the comments list */
  config: SuperCommentsConfig = {
    comments: [],
    element: null,
    commentsStore: null,
  };

  /** Vue application instance */
  app: App | null;

  /** SuperDoc instance */
  superdoc: SuperDoc;

  /** Mounted Vue component instance */
  container: ComponentPublicInstance | null;

  /**
   * Create a new SuperComments instance
   *
   * @param options - Configuration options
   * @param superdoc - The SuperDoc instance this comments list is connected to
   */
  constructor(options: SuperCommentsConfig, superdoc: SuperDoc) {
    super();
    this.config = { ...this.config, ...options };
    this.element = this.config.element || null;
    this.app = null;
    this.superdoc = superdoc;
    this.container = null;
    this.open();
  }

  /**
   * Create and configure the Vue application
   *
   * Sets up the Vue app with the CommentsList component, registers
   * the click-outside directive, and mounts the app to the target element.
   */
  createVueApp(): void {
    this.app = createApp(CommentsList);
    this.app.directive('click-outside', vClickOutside);
    this.app.config.globalProperties.$superdoc = this.superdoc;

    if (!this.element && this.config.selector) {
      const foundElement = document.getElementById(this.config.selector);
      this.element = foundElement;
    }

    if (this.element) {
      this.container = this.app.mount(this.element);
    }
  }

  /**
   * Close and unmount the comments list
   *
   * Cleans up the Vue application and removes it from the DOM.
   */
  close(): void {
    if (this.app && this.element) {
      this.app.unmount();
      this.app = null;
      this.container = null;
      this.element = null;
    }
  }

  /**
   * Open the comments list
   *
   * Creates the Vue app if it doesn't exist.
   */
  open(): void {
    if (!this.app) {
      this.createVueApp();
    }
  }
}
