export const BlockNodePluginKey: PluginKey<any>;
export const BlockNode: Extension;
export function nodeAllowsSdBlockIdAttr(node: import("prosemirror-model").Node): boolean;
export function nodeNeedsSdBlockId(node: import("prosemirror-model").Node): boolean;
export function checkForNewBlockNodesInTrs(transactions: Array<Transaction>): boolean;
import { PluginKey } from 'prosemirror-state';
import { Extension } from '@core/Extension.js';
