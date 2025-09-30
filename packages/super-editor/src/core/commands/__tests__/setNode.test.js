import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { doc, p, schema } from 'prosemirror-test-builder';
import { setNode } from '../setNode.js';

const setBlockTypeMock = vi.hoisted(() => vi.fn());

vi.mock('prosemirror-commands', () => ({
  setBlockType: setBlockTypeMock,
}));

const createState = () => {
  const docNode = doc(p('Sample'));
  const baseState = EditorState.create({ schema, doc: docNode });
  const selection = TextSelection.create(baseState.doc, 1, 3);
  return baseState.apply(baseState.tr.setSelection(selection));
};

const createChainStub = (state, dispatch, clearNodesReturn = true) => {
  const results = [];
  const clearNodes = vi.fn(() => clearNodesReturn);
  const chainInstance = {
    command: vi.fn((fn) => {
      const index = results.length;
      const context = index === 0 ? { commands: { clearNodes } } : { state, dispatch };
      const outcome = fn(context);
      results.push(outcome);
      return chainInstance;
    }),
    run: vi.fn(() => results.every(Boolean)),
  };

  return {
    chain: vi.fn(() => chainInstance),
    clearNodes,
    chainInstance,
    results,
  };
};

describe('setNode', () => {
  beforeEach(() => {
    setBlockTypeMock.mockReset();
  });

  it('converts node when block type can be set directly', () => {
    const state = createState();
    const dispatch = vi.fn();
    const { chain, clearNodes, chainInstance } = createChainStub(state, dispatch);

    const firstCall = vi.fn(() => true);
    const secondCall = vi.fn((_state, dispatchFn) => {
      dispatchFn?.('applied');
      return true;
    });

    setBlockTypeMock.mockImplementationOnce(() => firstCall).mockImplementationOnce(() => secondCall);

    const result = setNode('heading', { level: 2 })({ state, dispatch, chain });

    expect(result).toBe(true);
    expect(setBlockTypeMock).toHaveBeenNthCalledWith(1, schema.nodes.heading, { level: 2 });
    expect(firstCall).toHaveBeenCalledWith(state);
    expect(clearNodes).not.toHaveBeenCalled();
    expect(setBlockTypeMock).toHaveBeenNthCalledWith(2, schema.nodes.heading, { level: 2 });
    expect(secondCall).toHaveBeenCalledWith(state, dispatch);
    expect(dispatch).toHaveBeenCalledWith('applied');
    expect(chainInstance.run).toHaveBeenCalledTimes(1);
  });

  it('attempts to clear nodes when initial block conversion fails', () => {
    const state = createState();
    const dispatch = vi.fn();
    const { chain, clearNodes, chainInstance } = createChainStub(state, dispatch, true);

    const firstCall = vi.fn(() => false);
    const secondCall = vi.fn((_state, dispatchFn) => {
      dispatchFn?.('changed');
      return true;
    });

    setBlockTypeMock.mockImplementationOnce(() => firstCall).mockImplementationOnce(() => secondCall);

    const result = setNode('heading', { level: 1 })({ state, dispatch, chain });

    expect(result).toBe(true);
    expect(clearNodes).toHaveBeenCalledTimes(1);
    expect(firstCall).toHaveBeenCalledWith(state);
    expect(secondCall).toHaveBeenCalledWith(state, dispatch);
    expect(dispatch).toHaveBeenCalledWith('changed');
    expect(chainInstance.run).toHaveBeenCalledTimes(1);
  });

  it('returns false when node type is not a textblock', () => {
    const state = createState();
    const dispatch = vi.fn();
    const chain = vi.fn();

    const result = setNode('doc')({ state, dispatch, chain });

    expect(result).toBe(false);
    expect(setBlockTypeMock).not.toHaveBeenCalled();
    expect(chain).not.toHaveBeenCalled();
  });
});
