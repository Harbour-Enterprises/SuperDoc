import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { Mapping } from 'prosemirror-transform';
import { Extension } from '@core/Extension.js';

const PERMISSION_PLUGIN_KEY = new PluginKey('permissionRanges');
const EVERYONE_GROUP = 'everyone';

/**
 * Generates the identifier used to match permStart/permEnd pairs.
 * @param {import('prosemirror-model').Node} node
 * @param {number} pos
 * @param {string} fallbackPrefix
 * @returns {string}
 */
const getPermissionNodeId = (node, pos, fallbackPrefix) => String(node.attrs?.id ?? `${fallbackPrefix}-${pos}`);
/**
 * Parse permStart/permEnd pairs and return ranges.
 * @param {import('prosemirror-model').Node} doc
 * @returns {{ ranges: Array<{ id: string, from: number, to: number }>, hasAllowedRanges: boolean }}
 */
const buildPermissionState = (doc) => {
  const ranges = [];
  /** @type {Map<string, { from: number, attrs: any }>} */
  const openRanges = new Map();

  doc.descendants((node, pos) => {
    if (node.type?.name === 'permStart') {
      const id = getPermissionNodeId(node, pos, 'permStart');
      openRanges.set(id, {
        from: pos + node.nodeSize,
        attrs: node.attrs ?? {},
      });
      return false;
    }

    if (node.type?.name === 'permEnd') {
      const id = getPermissionNodeId(node, pos, 'permEnd');
      const start = openRanges.get(id);
      if (start && start.attrs?.edGrp === EVERYONE_GROUP) {
        const to = Math.max(pos + 1, start.from);
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
      highlightStyle:
        'background-color: rgba(255, 234, 138, 0.8); border-radius: 2px; box-shadow: inset 0 0 0 1px rgba(224, 176, 0, 0.3);',
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
            console.log('[debug] permissionState:', permissionState);
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

        appendTransaction(transactions, oldState, newState) {
          if (!transactions.some((tr) => tr.docChanged)) return null;

          const permStartType = newState.schema.nodes['permStart'];
          const permEndType = newState.schema.nodes['permEnd'];
          if (!permStartType || !permEndType) return null;

          let changedFrom = Infinity;
          let changedTo = -Infinity;
          transactions.forEach((tr) => {
            tr.steps.forEach((step) => {
              if (typeof step.from === 'number') {
                changedFrom = Math.min(changedFrom, step.from);
                changedTo = Math.max(changedTo, step.from);
              }
              if (typeof step.to === 'number') {
                changedFrom = Math.min(changedFrom, step.to);
                changedTo = Math.max(changedTo, step.to);
              }
            });
          });
          if (!Number.isFinite(changedFrom) || !Number.isFinite(changedTo)) {
            return null;
          }

          const oldDocSize = oldState.doc.content.size;
          const searchFrom = Math.max(0, Math.min(changedFrom, changedTo));
          const searchTo = Math.min(oldDocSize, Math.max(changedFrom, changedTo));
          if (searchTo < searchFrom) {
            return null;
          }

          const mappingToNew = new Mapping();
          transactions.forEach((tr) => {
            mappingToNew.appendMapping(tr.mapping);
          });

          const oldMarkers = [];
          oldState.doc.nodesBetween(searchFrom, searchTo, (node, pos) => {
            if (node.type !== permStartType && node.type !== permEndType) return;
            const id = node.attrs?.id;
            if (!id) return;

            oldMarkers.push({
              type: node.type.name,
              id,
              attrs: node.attrs ?? {},
              pos,
            });
          });
          if (!oldMarkers.length) return null;

          const markersInNew = new Set();
          newState.doc.descendants((node) => {
            if (node.type !== permStartType && node.type !== permEndType) return;
            const id = node.attrs?.id;
            if (!id) return;
            markersInNew.add(`${node.type.name}:${id}`);
          });

          const missingMarkers = oldMarkers.filter(({ type, id }) => !markersInNew.has(`${type}:${id}`));
          if (!missingMarkers.length) return null;

          const tr = newState.tr;
          let inserted = false;
          missingMarkers.forEach((marker) => {
            const assoc = marker.type === 'permStart' ? -1 : 1;
            const mapped = mappingToNew.mapResult(marker.pos, assoc);
            let insertPos = mapped.pos;
            insertPos = Math.max(0, Math.min(insertPos, tr.doc.content.size));
            const nodeType = marker.type === 'permStart' ? permStartType : permEndType;
            tr.insert(insertPos, nodeType.create(marker.attrs));
            inserted = true;
          });

          return inserted && tr.docChanged ? tr : null;
        },

        props: {
          decorations(state) {
            const decorations = PERMISSION_PLUGIN_KEY.getState(state).ranges.map(({ from, to }) => {
              const attrs = {};
              if (options.highlightClass) {
                attrs.class = options.highlightClass;
              }
              if (options.highlightStyle) {
                attrs.style = options.highlightStyle;
              }
              return Decoration.inline(from, to, attrs);
            });

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
