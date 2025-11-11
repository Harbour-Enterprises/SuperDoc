import { SuperDocCollaboration } from './collaboration/index.js';
import type {
  AutoSaveFn,
  AuthenticateFn,
  BeforeChangeFn,
  ChangeFn,
  ConfigureFn,
  Extension,
  Hooks,
  LoadFn,
  ServiceConfig,
} from './types.js';

export class CollaborationBuilder {
  #name = '';
  #debounceMs = 5000;
  #hooks: Hooks = {};
  #extensions: Extension[] = [];
  #documentExpiryMs = 5000;

  withName(name: string): this {
    this.#name = name;
    return this;
  }

  withDocumentExpiryMs(ms: number): this {
    this.#documentExpiryMs = ms;
    return this;
  }

  withDebounce(ms: number): this {
    this.#debounceMs = ms;
    return this;
  }

  onConfigure(userFunction: ConfigureFn): this {
    this.#hooks.configure = userFunction;
    return this;
  }

  onAuthenticate(userFunction: AuthenticateFn): this {
    this.#hooks.authenticate = userFunction;
    return this;
  }

  onLoad(userFunction: LoadFn): this {
    this.#hooks.load = userFunction;
    return this;
  }

  onAutoSave(userFunction: AutoSaveFn): this {
    this.#hooks.autoSave = userFunction;
    return this;
  }

  onBeforeChange(userFunction: BeforeChangeFn): this {
    this.#hooks.beforeChange = userFunction;
    return this;
  }

  onChange(userFunction: ChangeFn): this {
    this.#hooks.change = userFunction;
    return this;
  }

  useExtensions(exts: Extension[]): this {
    this.#extensions.push(...exts);
    return this;
  }

  build(): SuperDocCollaboration {
    if (!this.#name) {
      throw new Error('CollaborationBuilder: `.withName()` is required');
    }

    const config: ServiceConfig = {
      name: this.#name,
      documentExpiryMs: this.#documentExpiryMs,
      debounce: this.#debounceMs,
      hooks: this.#hooks,
      extensions: this.#extensions,
    };

    this.#hooks.configure?.(config);

    return new SuperDocCollaboration(config);
  }
}
