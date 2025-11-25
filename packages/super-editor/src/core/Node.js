// @ts-check
import { getExtensionConfigField } from './helpers/getExtensionConfigField.js';
import { callOrGet } from './utilities/callOrGet.js';

export class Node {
  /** @type {import('prosemirror-model').NodeType | String} */
  type = 'node';

  /** @type {string} */
  name = 'node';

  /** @type {import('./types/index.js').EditorNodeOptions} */
  options;

  /** @type {string} */
  group;

  /** @type {boolean} */
  atom;

  /** @type {import('./Editor.js').Editor} */
  editor;

  /** @type {import('./types/index.js').EditorNodeStorage} */
  storage;

  /** @type {import('./types/index.js').EditorNodeConfig} */
  config = {
    name: this.name,
  };

  /**
   * @param {import('./types/index.js').EditorNodeConfig} config
   */
  constructor(config) {
    this.config = {
      ...this.config,
      ...config,
    };

    this.name = this.config.name;
    this.group = this.config.group;

    if (this.config.addOptions) {
      this.options = callOrGet(
        getExtensionConfigField(this, 'addOptions', {
          name: this.name,
        }),
      );
    }

    this.storage =
      callOrGet(
        getExtensionConfigField(this, 'addStorage', {
          name: this.name,
          options: this.options,
        }),
      ) || {};
  }

  /**
   * Factory method to construct a new Node extension.
   *
   * @param {import('./types/index.js').EditorNodeConfig} config - The node configuration.
   * @returns {Node} A new Node instance.
   */
  static create(config) {
    return new Node(config);
  }
}
