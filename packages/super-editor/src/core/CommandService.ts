import type { Transaction, EditorState } from 'prosemirror-state';
import { chainableEditorState } from './helpers/chainableEditorState.js';
import type { Editor } from './Editor.js';
import type {
  CommandServiceOptions,
  EditorCommands,
  ChainableCommandObject,
  CanObject,
  CommandProps,
  Command,
} from './types/ChainedCommands.js';

/**
 * CommandService is the main class to work with commands.
 */
export class CommandService {
  editor: Editor;

  rawCommands: Record<string, (...args: unknown[]) => Command>;

  constructor(props: CommandServiceOptions) {
    this.editor = props.editor;
    this.rawCommands = this.editor.extensionService.commands;
  }

  /**
   * Static method for creating a service.
   * @param params Parameters for the constructor.
   * @returns New instance of CommandService
   */
  static create(params: CommandServiceOptions): CommandService {
    return new CommandService(params);
  }

  /**
   * Get editor state.
   * @returns Editor state
   */
  get state(): EditorState {
    return this.editor.state;
  }

  /**
   * Get all editor commands
   * @returns Commands object
   */
  get commands(): EditorCommands {
    const { editor, state } = this;
    const { view } = editor;
    const { tr } = state;
    const props = this.createProps(tr);

    const entries = Object.entries(this.rawCommands).map(([name, command]) => {
      const method = (...args: unknown[]): boolean => {
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

    return Object.fromEntries(entries) as EditorCommands;
  }

  /**
   * Create a chain of commands to call multiple commands at once.
   * @returns Function that creates a command chain
   */
  get chain(): (startTr?: Transaction, shouldDispatch?: boolean) => ChainableCommandObject {
    return () => this.createChain();
  }

  /**
   * Check if a command or a chain of commands can be executed. Without executing it.
   * @returns Function that creates a can object
   */
  get can(): () => CanObject {
    return () => this.createCan();
  }

  /**
   * Creates a chain of commands.
   * @param startTr - Start transaction.
   * @param shouldDispatch - Whether to dispatch the transaction.
   * @returns The command chain.
   */
  createChain(startTr?: Transaction, shouldDispatch: boolean = true): ChainableCommandObject {
    const { editor, state, rawCommands } = this;
    const { view } = editor;
    const callbacks: boolean[] = [];
    const hasStartTr = !!startTr;
    const tr = startTr || state.tr;

    const run = (): boolean => {
      if (!hasStartTr && shouldDispatch && !tr.getMeta('preventDispatch')) {
        view.dispatch(tr);
      }

      return callbacks.every((cb) => cb === true);
    };

    const entries = Object.entries(rawCommands).map(([name, command]) => {
      const chainedCommand = (...args: unknown[]): ChainableCommandObject => {
        const props = this.createProps(tr, shouldDispatch);
        const callback = command(...args)(props);
        callbacks.push(callback);
        return chain;
      };

      return [name, chainedCommand];
    });

    const chain: ChainableCommandObject = {
      ...Object.fromEntries(entries),
      run,
    } as ChainableCommandObject;

    return chain;
  }

  /**
   * Creates a can check for commands.
   * @param startTr - Start transaction.
   * @returns The can object.
   */
  createCan(startTr?: Transaction): CanObject {
    const { rawCommands, state } = this;
    const dispatch = false;
    const tr = startTr || state.tr;
    const props = this.createProps(tr, dispatch);

    const commands = Object.fromEntries(
      Object.entries(rawCommands).map(([name, command]) => {
        return [name, (...args: unknown[]) => command(...args)({ ...props, dispatch: undefined })];
      }),
    );

    const result = {
      ...commands,
      chain: () => this.createChain(tr, dispatch),
    };

    return result as CanObject;
  }

  /**
   * Creates default props for the command method.
   * @param tr Transaction.
   * @param shouldDispatch Check if should dispatch.
   * @returns Props object.
   */
  createProps(tr: Transaction, shouldDispatch: boolean = true): CommandProps {
    const { editor, state, rawCommands } = this;
    const { view } = editor;

    const props: CommandProps = {
      tr,
      editor,
      view,
      state: chainableEditorState(tr, state),
      dispatch: shouldDispatch ? () => undefined : undefined,
      chain: () => this.createChain(tr, shouldDispatch),
      can: () => this.createCan(tr),
      get commands(): EditorCommands {
        return Object.fromEntries(
          Object.entries(rawCommands).map(([name, command]) => {
            return [name, (...args: unknown[]) => command(...args)(props)];
          }),
        ) as EditorCommands;
      },
    };

    return props;
  }
}
