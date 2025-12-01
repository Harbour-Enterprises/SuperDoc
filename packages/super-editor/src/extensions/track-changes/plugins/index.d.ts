import type { PluginKey } from 'prosemirror-state';
import type { DecorationSet } from 'prosemirror-view';

export interface TrackChangesPluginState {
  isTrackChangesActive: boolean;
  onlyOriginalShown: boolean;
  onlyModifiedShown: boolean;
  decorations: DecorationSet;
}

export const TrackChangesBasePluginKey: PluginKey<TrackChangesPluginState>;
