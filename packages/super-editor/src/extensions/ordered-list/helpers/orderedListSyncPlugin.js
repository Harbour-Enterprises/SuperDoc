import { Plugin, PluginKey } from 'prosemirror-state';

/**
 * Synchronizes order attribute if lists have the same syncId.
 */
export function orderedListSync(options = {}) {
  return new Plugin({
    key: new PluginKey('orderedListSync'),

    appendTransaction: (transactions, oldState, newState) => {
      let docChanges = transactions.some((tr) => tr.docChanged) && !oldState.doc.eq(newState.doc);

      if (!docChanges) {
        return;
      }

      let { doc, tr } = newState;

      let listsBySyncId = {};
      doc.descendants((node, pos) => {
        if (node.type.name === 'orderedList' && !!node.attrs.syncId) {
          let syncId = node.attrs.syncId;
          if (!listsBySyncId[syncId]) listsBySyncId[syncId] = [];
          listsBySyncId[syncId].push({ node, pos });
        }
      });

      let hasListsToSync = !!Object.keys(listsBySyncId).length;

      if (!hasListsToSync) {
        return;
      }

      let changed = false;
      Object.entries(listsBySyncId).forEach(([_syncId, lists]) => {
        // If there are less than 2 lists, then we have nothing to sync.
        if (lists.length < 1) {
          let [firstList] = lists;
          tr.setNodeMarkup(firstList.pos, undefined, {
            ...firstList.node.attrs,
            syncId: null,
          });

          changed = true;
          return;
        }

        let [firstList] = lists;
        let currentOrder = firstList.node.attrs.order;

        lists.forEach((list, index) => {
          // Skip the first list.
          if (index === 0) return;

          let { node, pos } = list;
          let prevList = lists[index - 1];
          let newOrder = currentOrder + prevList.node.childCount;

          if (node.attrs.order !== newOrder) {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              order: newOrder,
            });
            changed = true;
          }

          currentOrder = newOrder;
        });
      });

      return changed ? tr : null;
    },
  });
};

export function randomId() {
  return Math.floor(Math.random() * 0xffffffff).toString();
};