import {
  listPermissionRangeEditors,
  resolvePermissionRangeEditor,
  type DocumentApi,
  type SetEditingRestrictionInput,
} from 'superdoc';

declare const doc: DocumentApi;
const modes: SetEditingRestrictionInput['mode'][] = ['readOnly', 'comments', 'trackedChanges', 'forms'];
for (const mode of modes) doc.protection.setEditingRestriction({ mode });
// @ts-expect-error use clearEditingRestriction to disable protection
doc.protection.setEditingRestriction({ mode: 'none' });
const users = [{ id: 'app-alice', email: 'alice@example.test', name: 'Alice' }];
listPermissionRangeEditors(users);
const resolution = resolvePermissionRangeEditor(users, 'app-alice');
if (resolution.status === 'resolved') {
  doc.permissionRanges.updatePrincipal({ id: '1', principal: resolution.principal });
}
