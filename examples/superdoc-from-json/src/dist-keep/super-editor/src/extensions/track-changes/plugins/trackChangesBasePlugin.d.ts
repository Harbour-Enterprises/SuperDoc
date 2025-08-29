export const TrackChangesBasePluginKey: PluginKey<any>;
export function TrackChangesBasePlugin(): Plugin<{
    isTrackChangesActive: boolean;
    onlyOriginalShown: boolean;
    onlyModifiedShown: boolean;
    decorations: DecorationSet;
}>;
import { PluginKey } from 'prosemirror-state';
import { DecorationSet } from 'prosemirror-view';
import { Plugin } from 'prosemirror-state';
