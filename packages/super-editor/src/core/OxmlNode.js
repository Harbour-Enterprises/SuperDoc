// @ts-check

import { Node } from './Node.js';

/**
 * @type {import('./types/index.js').OxmlNode}
 */
export class OxmlNode extends Node {
  /** @type {string} */
  oXmlName;

  /**
   * @param {import('./types/index.js').OxmlNodeConfig} config
   */
  constructor(config) {
    super(config);
    this.oXmlName = config.oXmlName;
  }

  /**
   * Factory method to construct a new OxmlNode instance.
   *
   * @param {import('./types/index.js').OxmlNodeConfig} config
   * @returns {OxmlNode} A new OxmlNode instance.
   */
  static create(config) {
    return new OxmlNode(config);
  }
}
