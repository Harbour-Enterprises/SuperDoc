//@ts-check
import { chainableEditorState } from './helpers/chainableEditorState.js';

/**
 * @typedef {import('prosemirror-state').Transaction} Transaction
 * @typedef {import('./commands/types/index.js').ChainableCommandObject} ChainableCommandObject
 */

/**
 * CommandService is the main class to work with commands.
 */
export class CommandService {
  editor;

  rawCommands;

  /**
   * @param {import('./commands/types/index.js').CommandServiceOptions} props
   */
  constructor(props) {
    this.editor = props.editor;
    this.rawCommands = this.editor.extensionService.commands;
  }

  /**
   * Static method for creating a service.
   * @param {import('./commands/types/index.js').CommandServiceOptions} params for the constructor.
   * @returns {CommandService} New instance of CommandService
   */
  static create(params) {
    return new CommandService(params);
  }

  /**
   * Get editor state.
   * @returns {import("prosemirror-state").EditorState} Editor state
   */
  get state() {
    return this.editor.state;
  }

  /**
   * Get all editor commands
   * @returns {import('./commands/types/index.js').EditorCommands} Commands object
   */
  get commands() {
    const { editor, state } = this;
    const { view } = editor;
    const { tr } = state;
    const props = this.createProps(tr);

    const entries = Object.entries(this.rawCommands).map(([name, command]) => {
      /** @type {(...args: any[]) => boolean} */
      const method = (...args) => {
        const fn = command(...args)(props);

        if (!tr.getMeta('preventDispatch')) {
          // Only dispatch if view exists (it may not exist during initialization)
          if (view && typeof view.dispatch === 'function') {
            view.dispatch(tr);
          }
        }

        return fn;
      };

      return [name, method];
    });

    return /** @type {import('./commands/types/index.js').EditorCommands} */ Object.fromEntries(entries);
  }

  /**
   * Create a chain of commands to call multiple commands at once.
   * @returns {(startTr?: Transaction, shouldDispatch?: boolean) => ChainableCommandObject} Function that creates a command chain
   */
  get chain() {
    return () => this.createChain();
  }

  /**
   * Check if a command or a chain of commands can be executed. Without executing it.
   * @returns {() => import('./commands/types/index.js').CanObject} Function that creates a can object
   */
  get can() {
    return () => this.createCan();
  }

  /**
   * Creates a chain of commands.
   * @param {import("prosemirror-state").Transaction} [startTr] - Start transaction.
   * @param {boolean} [shouldDispatch=true] - Whether to dispatch the transaction.
   * @returns {import('./commands/types/index.js').ChainableCommandObject} The command chain.
   */
  createChain(startTr, shouldDispatch = true) {
    const { editor, state, rawCommands } = this;
    const { view } = editor;
    const callbacks = [];
    const hasStartTr = !!startTr;
    const tr = startTr || state.tr;

    const run = () => {
      if (!hasStartTr && shouldDispatch && !tr.getMeta('preventDispatch')) {
        view.dispatch(tr);
      }

      return callbacks.every((cb) => cb === true);
    };

    const entries = Object.entries(rawCommands).map(([name, command]) => {
      const chainedCommand = (...args) => {
        const props = this.createProps(tr, shouldDispatch);
        const callback = command(...args)(props);
        callbacks.push(callback);
        return chain;
      };

      return [name, chainedCommand];
    });

    const chain = {
      ...Object.fromEntries(entries),
      run,
    };

    return chain;
  }

  /**
   * Creates a can check for commands.
   * @param {import("prosemirror-state").Transaction} [startTr] - Start transaction.
   * @returns {import('./commands/types/index.js').CanObject} The can object.
   */
  createCan(startTr) {
    const { rawCommands, state } = this;
    const dispatch = false;
    const tr = startTr || state.tr;
    const props = this.createProps(tr, dispatch);

    /** @type {Record<string, import('./commands/types/index.js').CanCommand>} */
    const commands = Object.fromEntries(
      Object.entries(rawCommands).map(([name, command]) => {
        return [name, (...args) => command(...args)({ ...props, dispatch: undefined })];
      }),
    );

    const result = {
      ...commands,
      chain: () => this.createChain(tr, dispatch),
    };

    return /** @type {import('./commands/types/index.js').CanObject} */ (result);
  }

  /**
   * Creates default props for the command method.
   * @param {import("prosemirror-state").Transaction} tr Transaction.
   * @param {boolean} shouldDispatch Check if should dispatch.
   * @returns {Object} Props object.
   */
  createProps(tr, shouldDispatch = true) {
    const { editor, state, rawCommands } = this;
    const { view } = editor;

    const props = {
      tr,
      editor,
      view,
      state: chainableEditorState(tr, state),
      dispatch: shouldDispatch ? () => undefined : undefined,
      chain: () => this.createChain(tr, shouldDispatch),
      can: () => this.createCan(tr),
      get commands() {
        return Object.fromEntries(
          Object.entries(rawCommands).map(([name, command]) => {
            return [name, (...args) => command(...args)(props)];
          }),
        );
      },
    };

    return props;
  }
}
