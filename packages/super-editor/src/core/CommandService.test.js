import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./helpers/chainableEditorState.js', () => ({
  chainableEditorState: vi.fn(() => 'mocked-chain-state'),
}));

import { chainableEditorState } from './helpers/chainableEditorState.js';
import { CommandService } from './CommandService.js';

describe('CommandService', () => {
  let editor;
  let view;
  let tr;

  beforeEach(() => {
    tr = {
      getMeta: vi.fn(() => false),
      setMeta: vi.fn(),
    };

    view = {
      dispatch: vi.fn(),
    };

    editor = {
      state: { tr },
      view,
      extensionService: { commands: {} },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('executes a command and dispatches when dispatch is allowed', () => {
    const commandResult = 'expected-result';
    const rawCommand = vi.fn((arg) => {
      expect(arg).toBe('payload');
      return (props) => {
        expect(props.editor).toBe(editor);
        expect(props.view).toBe(view);
        expect(props.tr).toBe(tr);
        expect(chainableEditorState).toHaveBeenCalledWith(tr, editor.state);
        expect(props.state).toBe('mocked-chain-state');
        expect(typeof props.dispatch).toBe('function');
        return commandResult;
      };
    });

    editor.extensionService.commands = { runSomething: rawCommand };

    const service = new CommandService({ editor });

    const result = service.commands.runSomething('payload');

    expect(result).toBe(commandResult);
    expect(view.dispatch).toHaveBeenCalledWith(tr);
    expect(rawCommand).toHaveBeenCalledTimes(1);
  });

  it('skips dispatch when preventDispatch meta is set', () => {
    tr.getMeta = vi.fn((key) => (key === 'preventDispatch' ? true : undefined));

    const rawCommand = vi.fn(() => {
      return () => true;
    });

    editor.extensionService.commands = { guarded: rawCommand };

    const service = new CommandService({ editor });

    const result = service.commands.guarded();

    expect(result).toBe(true);
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  it('creates chainable commands that dispatch once and return aggregated result', () => {
    const rawCommand = vi.fn(() => {
      return () => true;
    });

    editor.extensionService.commands = { first: rawCommand };

    const service = new CommandService({ editor });

    const chain = service.chain();

    expect(chain.first('arg')).toBe(chain);

    const runResult = chain.run();

    expect(runResult).toBe(true);
    expect(rawCommand).toHaveBeenCalledTimes(1);
    expect(view.dispatch).toHaveBeenCalledWith(tr);
  });

  it('chain created within can() does not dispatch', () => {
    const rawCommand = vi.fn(() => {
      return (props) => {
        expect(props.dispatch).toBeUndefined();
        return true;
      };
    });

    editor.extensionService.commands = { nullable: rawCommand };

    const service = new CommandService({ editor });

    const can = service.can();

    expect(can.nullable()).toBe(true);

    const chain = can.chain();
    chain.nullable();
    const runResult = chain.run();

    expect(runResult).toBe(true);
    expect(view.dispatch).not.toHaveBeenCalled();
  });
});
