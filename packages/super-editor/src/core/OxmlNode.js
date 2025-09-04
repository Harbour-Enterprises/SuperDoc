// @ts-check

import { Node } from '@core/index.js';
import { childrenOf } from '@superdoc-dev/ooxml-inspector';

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

  /**
   * Get the valid children of the OxmlNode.
   * @returns {string[]} The valid children.
   */
  get validChildren() {
    return childrenOf(this.oXmlName);
  }
}
