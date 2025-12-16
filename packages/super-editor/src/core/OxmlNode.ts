import { Node } from './Node.js';
import type { NodeConfig } from './Node.js';

/**
 * Configuration for OXML Node extensions (extends NodeConfig)
 */
export interface OxmlNodeConfig<
  Options extends Record<string, unknown> = Record<string, never>,
  Storage extends Record<string, unknown> = Record<string, never>,
> extends NodeConfig<Options, Storage> {
  /** The OXML element name */
  oXmlName: string;

  /** Child attributes to extract */
  childToAttributes?: string[];
}

/**
 * OxmlNode class extends Node with OXML-specific properties.
 * @template Options - Type for node options
 * @template Storage - Type for node storage
 */
export class OxmlNode<
  Options extends Record<string, unknown> = Record<string, never>,
  Storage extends Record<string, unknown> = Record<string, never>,
> extends Node<Options, Storage> {
  oXmlName: string;

  constructor(config: OxmlNodeConfig<Options, Storage>) {
    super(config);
    this.oXmlName = config.oXmlName;
  }

  /**
   * Factory method to construct a new OxmlNode instance.
   * @param config - The OXML node configuration.
   * @returns A new OxmlNode instance.
   */
  static create<
    O extends Record<string, unknown> = Record<string, never>,
    S extends Record<string, unknown> = Record<string, never>,
  >(config: OxmlNodeConfig<O, S>): OxmlNode<O, S> {
    return new OxmlNode<O, S>(config);
  }
}
