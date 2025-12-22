import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { Extension } from '@core/Extension.js';

const PERMISSION_PLUGIN_KEY = new PluginKey('permissionRanges');
const EVERYONE_GROUP = 'everyone';

/**
 * Parse permStart/permEnd pairs and return ranges limited to `edGrp="everyone"`.
 * @param {import('prosemirror-model').Node} doc
 * @returns {{ ranges: Array<{ id: string, from: number, to: number }>, hasAllowedRanges: boolean }}
 */
const buildPermissionState = (doc) => {
  const ranges = [];
  /** @type {Map<string, { from: number, attrs: any }>} */
  const openRanges = new Map();

  doc.descendants((node, pos) => {
    if (node.type?.name === 'permStart') {
      const id = String(node.attrs?.id ?? `permStart-${pos}`);
      openRanges.set(id, {
        from: pos + node.nodeSize,
        attrs: node.attrs ?? {},
      });
      return false;
    }

    if (node.type?.name === 'permEnd') {
      const id = String(node.attrs?.id ?? `permEnd-${pos}`);
      const start = openRanges.get(id);
      if (start && start.attrs?.edGrp === EVERYONE_GROUP) {
        const to = Math.max(pos, start.from);
        if (to > start.from) {
          ranges.push({
            id,
            from: start.from,
            to,
          });
        }
      }
      if (start) {
        openRanges.delete(id);
      }
      return false;
    }
  });

  return {
    ranges,
    hasAllowedRanges: ranges.length > 0,
  };
};

/**
 * Collects the ranges affected by a transaction, based on the document BEFORE the change.
 * @param {import('prosemirror-state').Transaction} tr
 * @returns {Array<{ from: number, to: number }>}
 */
const collectChangedRanges = (tr) => {
  const ranges = [];
  tr.mapping.maps.forEach((map) => {
    map.forEach((oldStart, oldEnd) => {
      const from = Math.min(oldStart, oldEnd);
      const to = Math.max(oldStart, oldEnd);
      ranges.push({ from, to });
    });
  });
  return ranges;
};

/**
 * Checks if affected range is entirely within an allowed permission range.
 * @param {{ from: number, to: number }} range
 * @param {Array<{ from: number, to: number }>} allowedRanges
 */
const isRangeAllowed = (range, allowedRanges) => {
  if (!allowedRanges?.length) return false;
  return allowedRanges.some((allowed) => range.from >= allowed.from && range.to <= allowed.to);
};

/**
 * Checks whether the current selection is fully contained within one of the allowed ranges.
 * @param {import('prosemirror-state').EditorState} state
 * @param {Array<{ from: number, to: number }>} allowedRanges
 */
const isSelectionAllowed = (state, allowedRanges) => {
  if (!allowedRanges?.length) return false;
  const { selection } = state;
  if (!selection) return false;
  const { from, to } = selection;
  return allowedRanges.some((allowed) => from >= allowed.from && to <= allowed.to);
};

/**
 * @module PermissionRanges
 * A helper extension that ensures content wrapped with w:permStart/w:permEnd and `edGrp="everyone"`
 * stays editable even when the document is in viewing mode.
 */
export const PermissionRanges = Extension.create({
  name: 'permissionRanges',

  addOptions() {
    return {
      highlightClass: 'sd-permission-allowed',
    };
  },

  addStorage() {
    return {
      ranges: [],
      hasAllowedRanges: false,
    };
  },

  addPmPlugins() {
    const editor = this.editor;
    const options = this.options;
    const storage = this.storage;
    let originalSetDocumentMode = null;

    const maybeToggleEditable = (hasAllowedRanges) => {
      storage.hasAllowedRanges = Boolean(hasAllowedRanges);
      if (!editor || editor.isDestroyed) return;
      if (editor.options.documentMode !== 'viewing') return;
      if (hasAllowedRanges && !editor.isEditable) {
        editor.setEditable(true, false);
      } else if (!hasAllowedRanges && editor.isEditable) {
        editor.setEditable(false, false);
      }
    };

    if (editor && typeof editor.setDocumentMode === 'function') {
      originalSetDocumentMode = editor.setDocumentMode.bind(editor);
      editor.setDocumentMode = (mode, caller) => {
        originalSetDocumentMode(mode, caller);
        const state = editor.state;
        if (!state) return;
        const pluginState = PERMISSION_PLUGIN_KEY.getState(state);
        if (pluginState) {
          maybeToggleEditable(pluginState.hasAllowedRanges);
        }
      };
    }

    return [
      new Plugin({
        key: PERMISSION_PLUGIN_KEY,
        state: {
          init(_, state) {
            const permissionState = buildPermissionState(state.doc);
            storage.ranges = permissionState.ranges;
            maybeToggleEditable(permissionState.hasAllowedRanges);
            return permissionState;
          },

          apply(tr, value, _oldState, newState) {
            let permissionState = value;
            if (tr.docChanged) {
              permissionState = buildPermissionState(newState.doc);
              storage.ranges = permissionState.ranges;
            }

            maybeToggleEditable(permissionState.hasAllowedRanges);
            return permissionState;
          },
        },

        view() {
          return {
            destroy() {
              if (editor && originalSetDocumentMode) {
                editor.setDocumentMode = originalSetDocumentMode;
              }
            },
          };
        },

        props: {
          decorations(state) {
            if (editor?.options.documentMode !== 'viewing') return null;
            const pluginState = PERMISSION_PLUGIN_KEY.getState(state);
            if (!pluginState?.ranges?.length) return null;

            const decorations = pluginState.ranges.map(({ from, to }) =>
              Decoration.inline(from, to, { class: options.highlightClass }),
            );

            return DecorationSet.create(state.doc, decorations);
          },
        },

        filterTransaction(tr, state) {
          if (!tr.docChanged) return true;
          if (!editor || editor.options.documentMode !== 'viewing') return true;
          const pluginState = PERMISSION_PLUGIN_KEY.getState(state);
          if (!pluginState?.hasAllowedRanges) {
            return false;
          }
          const changedRanges = collectChangedRanges(tr);
          if (!isSelectionAllowed(state, pluginState.ranges)) {
            return false;
          }
          if (!changedRanges.length) return true;
          return changedRanges.every((range) => isRangeAllowed(range, pluginState.ranges));
        },
      }),
    ];
  },
});
