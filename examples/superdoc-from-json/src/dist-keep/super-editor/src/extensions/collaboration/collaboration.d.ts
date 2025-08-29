export const CollaborationPluginKey: PluginKey<any>;
export const Collaboration: Extension;
export function createSyncPlugin(ydoc: any, editor: any): any[];
export function initializeMetaMap(ydoc: any, editor: any): void;
export function generateCollaborationData(editor: any): Promise<Uint8Array<ArrayBufferLike>>;
import { PluginKey } from 'prosemirror-state';
import { Extension } from '@core/index.js';
