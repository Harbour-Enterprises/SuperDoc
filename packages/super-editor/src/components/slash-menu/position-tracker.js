import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export const PositionTrackerPluginKey = new PluginKey('positionTracker');

/**
 * Plugin to track positions in the document that persist across collaborative edits
 * Used primarily for tracking where a context menu was opened
 */
export const createPositionTrackerPlugin = () => {
  return new Plugin({
    key: PositionTrackerPluginKey,
    state: {
      init() {
        return {
          decorations: DecorationSet.empty,
          trackedPosition: null,
        };
      },
      apply(tr, value, oldState, newState) {
        const meta = tr.getMeta(PositionTrackerPluginKey);

        // Handle commands via meta
        if (meta?.command === 'track') {
          // Add a new tracking decoration at the specified position
          const decoration = Decoration.widget(
            meta.pos,
            () => {
              // Return an invisible element
              const span = document.createElement('span');
              span.style.display = 'none';
              span.setAttribute('data-position-tracker', 'true');
              return span;
            },
            { key: 'position-tracker', side: 0 },
          );

          return {
            decorations: DecorationSet.create(newState.doc, [decoration]),
            trackedPosition: meta.pos,
          };
        }

        if (meta?.command === 'clear') {
          // Clear the tracking decoration
          return {
            decorations: DecorationSet.empty,
            trackedPosition: null,
          };
        }

        // Map decorations through document changes
        if (value.decorations && !value.decorations.eq(DecorationSet.empty)) {
          return {
            decorations: value.decorations.map(tr.mapping, tr.doc),
            trackedPosition: value.trackedPosition !== null ? tr.mapping.map(value.trackedPosition) : null,
          };
        }

        return value;
      },
    },
    props: {
      decorations(state) {
        return this.getState(state).decorations;
      },
    },
  });
};

/**
 * Start tracking a position in the document
 * @param {EditorView} view - The editor view
 * @param {number} pos - The position to track
 */
export function trackPosition(view, pos) {
  const tr = view.state.tr;
  tr.setMeta(PositionTrackerPluginKey, { command: 'track', pos });
  view.dispatch(tr);
}

/**
 * Get the current tracked position (mapped through document changes)
 * @param {EditorState} state - The editor state
 * @returns {number|null} The current tracked position or null if not tracking
 */
export function getTrackedPosition(state) {
  const pluginState = PositionTrackerPluginKey.getState(state);
  if (!pluginState || !pluginState.decorations) {
    return null;
  }

  // Find the decoration and return its position
  const decorations = pluginState.decorations.find();
  if (decorations.length > 0) {
    return decorations[0].from;
  }

  return null;
}

/**
 * Clear the tracked position
 * @param {EditorView} view - The editor view
 */
export function clearTrackedPosition(view) {
  const tr = view.state.tr;
  tr.setMeta(PositionTrackerPluginKey, { command: 'clear' });
  view.dispatch(tr);
}
