import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditorState } from 'prosemirror-state';
import { Schema } from 'prosemirror-model';
import {
  createPositionTrackerPlugin,
  trackPosition,
  getTrackedPosition,
  clearTrackedPosition,
  PositionTrackerPluginKey,
} from './position-tracker.js';

describe('position-tracker plugin', () => {
  let schema;
  let state;
  let view;

  beforeEach(() => {
    // Create a minimal schema for testing
    schema = new Schema({
      nodes: {
        doc: {
          content: 'block+',
        },
        paragraph: {
          group: 'block',
          content: 'inline*',
          parseDOM: [{ tag: 'p' }],
          toDOM: () => ['p', 0],
        },
        text: {
          group: 'inline',
        },
      },
    });

    // Create a simple document
    const doc = schema.nodes.doc.create({}, [
      schema.nodes.paragraph.create({}, schema.text('Hello world')),
      schema.nodes.paragraph.create({}, schema.text('Second paragraph')),
    ]);

    // Create editor state with the plugin
    state = EditorState.create({
      schema,
      doc,
      plugins: [createPositionTrackerPlugin()],
    });

    // Create a mock view
    view = {
      state,
      dispatch: vi.fn((tr) => {
        view.state = view.state.apply(tr);
      }),
    };
  });

  describe('createPositionTrackerPlugin', () => {
    it('should create a plugin with correct key', () => {
      const plugin = createPositionTrackerPlugin();
      expect(plugin.spec.key).toBe(PositionTrackerPluginKey);
    });

    it('should initialize with empty state', () => {
      const pluginState = PositionTrackerPluginKey.getState(state);
      expect(pluginState).toBeDefined();
      expect(pluginState.trackedPosition).toBeNull();
      expect(pluginState.decorations).toBeDefined();
    });
  });

  describe('trackPosition', () => {
    it('should track a position in the document', () => {
      trackPosition(view, 5);

      const pluginState = PositionTrackerPluginKey.getState(view.state);
      expect(pluginState.trackedPosition).toBe(5);
      expect(view.dispatch).toHaveBeenCalledTimes(1);
    });

    it('should create a decoration at the tracked position', () => {
      trackPosition(view, 3);

      const pluginState = PositionTrackerPluginKey.getState(view.state);
      const decorations = pluginState.decorations.find();
      expect(decorations.length).toBe(1);
      expect(decorations[0].from).toBe(3);
    });

    it('should replace previous tracked position', () => {
      trackPosition(view, 5);
      expect(view.dispatch).toHaveBeenCalledTimes(1);

      trackPosition(view, 10);
      expect(view.dispatch).toHaveBeenCalledTimes(2);

      const pluginState = PositionTrackerPluginKey.getState(view.state);
      expect(pluginState.trackedPosition).toBe(10);

      const decorations = pluginState.decorations.find();
      expect(decorations.length).toBe(1);
      expect(decorations[0].from).toBe(10);
    });
  });

  describe('getTrackedPosition', () => {
    it('should return null when no position is tracked', () => {
      const position = getTrackedPosition(state);
      expect(position).toBeNull();
    });

    it('should return the tracked position', () => {
      trackPosition(view, 7);
      const position = getTrackedPosition(view.state);
      expect(position).toBe(7);
    });

    it('should return mapped position after document changes', () => {
      // Track position at 10
      trackPosition(view, 10);

      // Insert text before the tracked position
      const tr = view.state.tr.insertText('New ', 1);
      view.state = view.state.apply(tr);

      // Position should be mapped forward
      const position = getTrackedPosition(view.state);
      expect(position).toBeGreaterThan(10);
      expect(position).toBe(14); // 10 + length of "New "
    });

    it('should handle deletion before tracked position', () => {
      trackPosition(view, 15);

      // Delete some text before tracked position
      const tr = view.state.tr.delete(1, 5);
      view.state = view.state.apply(tr);

      const position = getTrackedPosition(view.state);
      expect(position).toBeLessThan(15);
      expect(position).toBe(11); // 15 - 4 deleted characters
    });
  });

  describe('clearTrackedPosition', () => {
    it('should clear the tracked position', () => {
      trackPosition(view, 8);
      expect(getTrackedPosition(view.state)).toBe(8);

      clearTrackedPosition(view);
      expect(view.dispatch).toHaveBeenCalledTimes(2);

      const pluginState = PositionTrackerPluginKey.getState(view.state);
      expect(pluginState.trackedPosition).toBeNull();
    });

    it('should remove decorations when clearing', () => {
      trackPosition(view, 8);

      let pluginState = PositionTrackerPluginKey.getState(view.state);
      expect(pluginState.decorations.find().length).toBe(1);

      clearTrackedPosition(view);

      pluginState = PositionTrackerPluginKey.getState(view.state);
      expect(pluginState.decorations.find().length).toBe(0);
    });

    it('should return null from getTrackedPosition after clearing', () => {
      trackPosition(view, 12);
      expect(getTrackedPosition(view.state)).toBe(12);

      clearTrackedPosition(view);
      expect(getTrackedPosition(view.state)).toBeNull();
    });
  });

  describe('decoration mapping', () => {
    it('should map decorations through insertions', () => {
      trackPosition(view, 5);

      // Insert text at position 2
      const tr = view.state.tr.insertText('ABC', 2);
      view.state = view.state.apply(tr);

      const position = getTrackedPosition(view.state);
      expect(position).toBe(8); // 5 + 3 characters
    });

    it('should map decorations through deletions', () => {
      trackPosition(view, 10);

      // Delete range that doesn't include the tracked position
      const tr = view.state.tr.delete(2, 4);
      view.state = view.state.apply(tr);

      const position = getTrackedPosition(view.state);
      expect(position).toBe(8); // 10 - 2 deleted characters
    });

    it('should handle replacement operations', () => {
      trackPosition(view, 15);

      // Replace some text before the tracked position
      const tr = view.state.tr.replaceWith(5, 8, schema.text('XYZ'));
      view.state = view.state.apply(tr);

      const position = getTrackedPosition(view.state);
      // Position should be adjusted based on the replacement
      expect(position).toBeDefined();
      expect(position).toBeGreaterThan(0);
    });
  });

  describe('widget decoration', () => {
    it('should create a decoration at the tracked position', () => {
      trackPosition(view, 5);

      const pluginState = PositionTrackerPluginKey.getState(view.state);
      const decorations = pluginState.decorations.find();

      expect(decorations.length).toBe(1);
      expect(decorations[0].from).toBe(5);
    });

    it('should maintain decoration at correct position', () => {
      trackPosition(view, 7);

      const pluginState = PositionTrackerPluginKey.getState(view.state);
      const decorations = pluginState.decorations.find();

      // Decoration exists at the right position
      expect(decorations.length).toBe(1);
      expect(decorations[0].from).toBe(7);
      expect(decorations[0].to).toBe(7);
    });
  });

  describe('edge cases', () => {
    it('should handle tracking position 0', () => {
      trackPosition(view, 0);
      const position = getTrackedPosition(view.state);
      expect(position).toBe(0);
    });

    it('should handle tracking position at document end', () => {
      const docSize = view.state.doc.content.size;
      trackPosition(view, docSize);
      const position = getTrackedPosition(view.state);
      expect(position).toBe(docSize);
    });

    it('should handle multiple clears without errors', () => {
      trackPosition(view, 5);
      clearTrackedPosition(view);
      clearTrackedPosition(view);

      const position = getTrackedPosition(view.state);
      expect(position).toBeNull();
    });

    it('should handle getting position when plugin state is empty', () => {
      // Create state without plugin
      const stateWithoutPlugin = EditorState.create({
        schema,
        doc: view.state.doc,
      });

      const position = getTrackedPosition(stateWithoutPlugin);
      expect(position).toBeNull();
    });
  });

  describe('transaction metadata', () => {
    it('should set correct meta for track command', () => {
      const tr = view.state.tr;
      tr.setMeta(PositionTrackerPluginKey, { command: 'track', pos: 5 });

      const newState = view.state.apply(tr);
      const pluginState = PositionTrackerPluginKey.getState(newState);

      expect(pluginState.trackedPosition).toBe(5);
    });

    it('should set correct meta for clear command', () => {
      // First track a position
      trackPosition(view, 5);

      const tr = view.state.tr;
      tr.setMeta(PositionTrackerPluginKey, { command: 'clear' });

      const newState = view.state.apply(tr);
      const pluginState = PositionTrackerPluginKey.getState(newState);

      expect(pluginState.trackedPosition).toBeNull();
      expect(pluginState.decorations.find().length).toBe(0);
    });

    it('should preserve state when no relevant meta is set', () => {
      trackPosition(view, 10);

      // Apply a transaction without relevant meta
      const tr = view.state.tr.insertText('x', 2);
      const newState = view.state.apply(tr);

      const pluginState = PositionTrackerPluginKey.getState(newState);
      expect(pluginState.trackedPosition).toBe(11); // Mapped from 10
    });
  });

  describe('integration with collaboration', () => {
    it('should maintain position through collaborative changes', () => {
      trackPosition(view, 10);

      // Simulate collaborative insertion before tracked position
      const tr1 = view.state.tr.insertText('collab ', 3);
      view.state = view.state.apply(tr1);

      expect(getTrackedPosition(view.state)).toBe(17); // 10 + 7

      // Simulate another collaborative change
      const tr2 = view.state.tr.delete(5, 8);
      view.state = view.state.apply(tr2);

      const finalPos = getTrackedPosition(view.state);
      expect(finalPos).toBeLessThan(17);
      expect(finalPos).toBeGreaterThan(0);
    });
  });
});
