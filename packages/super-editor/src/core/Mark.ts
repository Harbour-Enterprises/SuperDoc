import { getExtensionConfigField } from './helpers/getExtensionConfigField.js';
import { callOrGet } from './utilities/callOrGet.js';
import type { MaybeGetter } from './utilities/callOrGet.js';

/**
 * Configuration for Mark extensions.
 */
export interface MarkConfig<
  Options extends Record<string, unknown> = Record<string, never>,
  Storage extends Record<string, unknown> = Record<string, never>,
> {
  /** The unique name of the mark */
  name: string;

  /** Whether this mark is from an external package */
  isExternal?: boolean;

  /** Function to define mark options */
  addOptions?: MaybeGetter<Options>;

  /** Function to define mark storage */
  addStorage?: MaybeGetter<Storage>;

  /** Additional config fields - use with caution */
  [key: string]: unknown;
}

/**
 * Mark class is used to create Mark extensions.
 * @template Options - Type for mark options
 * @template Storage - Type for mark storage
 */
export class Mark<
  Options extends Record<string, unknown> = Record<string, never>,
  Storage extends Record<string, unknown> = Record<string, never>,
> {
  type = 'mark' as const;

  name: string = 'mark';

  options: Options;

  storage: Storage;

  isExternal: boolean;

  config: MarkConfig<Options, Storage>;

  constructor(config: MarkConfig<Options, Storage>) {
    this.config = {
      ...config,
      name: config.name || this.name,
    };

    this.name = this.config.name;

    this.isExternal = Boolean(this.config.isExternal);

    if (this.config.addOptions) {
      this.options = (callOrGet(
        getExtensionConfigField(this, 'addOptions', {
          name: this.name,
        }),
      ) || {}) as Options;
    } else {
      this.options = {} as Options;
    }

    this.storage = (callOrGet(
      getExtensionConfigField(this, 'addStorage', {
        name: this.name,
        options: this.options,
      }),
    ) || {}) as Storage;
  }

  /**
   * Static method for creating Mark extension.
   * @param config Configuration for the mark.
   */
  static create<
    O extends Record<string, unknown> = Record<string, never>,
    S extends Record<string, unknown> = Record<string, never>,
  >(config: MarkConfig<O, S>): Mark<O, S> {
    return new Mark<O, S>(config);
  }
}
