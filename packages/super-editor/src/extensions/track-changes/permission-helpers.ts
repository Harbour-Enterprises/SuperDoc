import { getTrackChanges } from './trackChangesHelpers/getTrackChanges.js';
import type { EditorState } from 'prosemirror-state';
import type { Mark as PmMark } from 'prosemirror-model';
import type { PermissionParams } from '@core/types/EditorConfig.js';

type Editor = {
  options?: {
    role?: string;
    isInternal?: boolean;
    user?: unknown;
    permissionResolver?: (params: PermissionParams) => boolean | undefined;
  };
} | null;

type RawTrackedChange = { mark: PmMark; from: number; to: number; comment?: unknown };
type NormalizedChange = {
  id: string | null;
  type: string | null;
  attrs: Record<string, unknown>;
  from: number;
  to: number;
  segments: { from: number; to: number }[];
  comment?: unknown;
};

const PERMISSION_MAP = {
  accept: {
    own: 'RESOLVE_OWN',
    other: 'RESOLVE_OTHER',
  },
  reject: {
    own: 'REJECT_OWN',
    other: 'REJECT_OTHER',
  },
} as const;

const buildKey = (change: RawTrackedChange) => {
  const id = (change.mark?.attrs as Record<string, unknown> | undefined)?.id ?? `${change.from}-${change.to}`;
  return `${id}:${change.mark?.type?.name ?? 'unknown'}`;
};

const mergeChange = (bucket: Map<string, NormalizedChange>, change: RawTrackedChange) => {
  const key = buildKey(change);
  const existing = bucket.get(key);

  if (existing) {
    existing.from = Math.min(existing.from, change.from);
    existing.to = Math.max(existing.to, change.to);
    existing.segments.push({ from: change.from, to: change.to });
  } else {
    bucket.set(key, {
      id: (change.mark?.attrs as Record<string, unknown> | undefined)?.id?.toString() ?? null,
      type: change.mark?.type?.name ?? null,
      attrs: { ...(change.mark?.attrs ?? {}) } as Record<string, unknown>,
      from: change.from,
      to: change.to,
      segments: [{ from: change.from, to: change.to }],
      comment: change.comment,
    });
  }
};

/**
 * Collect tracked changes intersecting the provided range.
 * When the range is collapsed, this returns changes spanning the cursor position.
 *
 * @param {Object} params
 * @param {import('prosemirror-state').EditorState} params.state
 * @param {number} params.from
 * @param {number} params.to
 * @returns {Array<Object>} Normalised tracked change descriptors
 */
export const collectTrackedChanges = ({
  state,
  from,
  to,
}: {
  state: EditorState;
  from: number;
  to: number;
}): NormalizedChange[] => {
  if (!state) return [];
  const collapsed = from === to;
  const changes = getTrackChanges(state) as RawTrackedChange[];
  if (!changes?.length) return [];

  const bucket = new Map<string, NormalizedChange>();

  changes.forEach((change) => {
    const overlaps = collapsed ? change.from <= from && change.to >= from : change.from < to && change.to > from;

    if (!overlaps) return;
    mergeChange(bucket, change);
  });

  return Array.from(bucket.values());
};

const derivePermissionKey = ({ action, isOwn }: { action: 'accept' | 'reject'; isOwn: boolean }) => {
  const mapping = PERMISSION_MAP[action];
  if (!mapping) return null;
  return isOwn ? mapping.own : mapping.other;
};

const normalizeEmail = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const resolveChanges = (editor?: Editor | null) => {
  if (!editor) return { role: 'editor', isInternal: false, currentUser: null, resolver: null };
  const role = editor.options?.role ?? 'editor';
  const isInternal = Boolean(editor.options?.isInternal);
  const currentUser = editor.options?.user ?? null;
  const resolver = editor.options?.permissionResolver;
  return { role, isInternal, currentUser, resolver };
};

/**
 * Determine whether a tracked-change action is allowed for the given editor context.
 *
 * @param {Object} params
 * @param {import('@harbour-enterprises/super-editor').Editor} params.editor
 * @param {'accept'|'reject'} params.action
 * @param {Array<Object>} params.trackedChanges
 * @returns {boolean}
 */
export const isTrackedChangeActionAllowed = ({
  editor,
  action,
  trackedChanges,
}: {
  editor: Editor | null;
  action: 'accept' | 'reject';
  trackedChanges: NormalizedChange[];
}) => {
  if (!trackedChanges?.length) return true;
  const { role, isInternal, currentUser, resolver } = resolveChanges(editor);
  if (typeof resolver !== 'function') return true;

  const currentEmail = normalizeEmail((currentUser as Record<string, unknown> | null)?.email);

  return trackedChanges.every((change) => {
    const authorEmail = normalizeEmail((change.attrs as Record<string, unknown> | undefined)?.authorEmail);
    const isOwn = !currentEmail || !authorEmail || currentEmail === authorEmail;
    const permission = derivePermissionKey({ action, isOwn });

    if (!permission) return true;

    const payload: PermissionParams = {
      permission,
      role,
      isInternal,
      trackedChange: {
        id: change.id,
        type: change.type,
        attrs: change.attrs,
        from: change.from,
        to: change.to,
        segments: change.segments,
        commentId: change.id,
      } as unknown,
      comment: (change.comment ?? null) as unknown,
    };

    return resolver(payload) !== false;
  });
};

/**
 * Derive tracked changes for a single position using metadata available in context menus.
 *
 * @param {Object} params
 * @param {import('prosemirror-state').EditorState} params.state
 * @param {number|null} params.pos
 * @param {string|null} params.trackedChangeId
 * @returns {Array<Object>}
 */
export const collectTrackedChangesForContext = ({
  state,
  pos,
  trackedChangeId,
}: {
  state: EditorState;
  pos: number | null;
  trackedChangeId: string | null;
}): NormalizedChange[] => {
  if (pos == null) return [];
  const changes = collectTrackedChanges({ state, from: pos, to: pos });
  if (!trackedChangeId) return changes;
  return changes.filter((change) => change.id === trackedChangeId);
};
