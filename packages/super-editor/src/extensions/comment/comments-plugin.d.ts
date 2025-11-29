import type { PluginKey } from 'prosemirror-state';
import type { DecorationSet } from 'prosemirror-view';
import type { Mark } from 'prosemirror-model';

export interface CommentPositionMap {
  [threadId: string]: {
    threadId: string;
    start: number;
    end: number;
    bounds: { top: number; bottom: number; left: number; right: number };
  };
}

export interface TrackedChangeRecord {
  insertion?: string;
  deletion?: string;
  format?: string;
}

export interface CommentsPluginState {
  activeThreadId: string | null;
  externalColor: string;
  internalColor: string;
  decorations: DecorationSet;
  allCommentPositions: CommentPositionMap;
  allCommentIds: string[];
  changedActiveThread: boolean;
  trackedChanges: Record<string, TrackedChangeRecord>;
}

export const CommentsPluginKey: PluginKey<CommentsPluginState>;
