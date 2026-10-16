import { describe, expect, it } from 'bun:test';
import { listPermissionRangeEditors, resolvePermissionRangeEditor } from './permission-ranges.js';

describe('host-owned Word editor discovery (SD-6011)', () => {
  const users = Object.freeze([
    Object.freeze({ id: 'app-alice', email: 'alice@example.test', name: 'Alice' }),
    Object.freeze({ id: 'app-bob', name: 'Bob' }),
    Object.freeze({ name: 'Display name only' }),
  ]);
  it('lists selectable host identities and resolves application IDs to Word email principals', () => {
    expect(listPermissionRangeEditors(users)).toMatchObject([
      { status: 'resolved', id: 'app-alice', principal: { kind: 'editor', id: 'alice@example.test' } },
      { status: 'resolved', id: 'app-bob', principal: { kind: 'editor', id: 'app-bob' } },
    ]);
    expect(resolvePermissionRangeEditor(users, 'ALICE@example.test')).toMatchObject({
      status: 'resolved',
      editor: users[0],
    });
    expect(resolvePermissionRangeEditor(users, 'Alice')).toEqual({ status: 'unknown', id: 'Alice' });
    expect(resolvePermissionRangeEditor(users, 'absent')).toEqual({ status: 'unknown', id: 'absent' });
    expect(resolvePermissionRangeEditor(users, '')).toEqual({ status: 'unknown', id: '' });
  });
  it('refuses duplicate IDs, duplicate Word emails, and email/ID collisions', () => {
    for (const roster of [
      [{ id: 'alice' }, { id: 'alice' }],
      [
        { id: 'alice', email: 'same@example.test' },
        { id: 'bob', email: 'SAME@example.test' },
      ],
      [{ id: 'alice', email: 'same@example.test' }, { id: 'same@example.test' }],
    ])
      expect(resolvePermissionRangeEditor(roster, 'alice')).toEqual({ status: 'ambiguous', id: 'alice' });
  });
  it('returns a copy so callers cannot mutate the roster through a resolution', () => {
    const resolved = resolvePermissionRangeEditor(users, 'app-alice');
    if (resolved.status !== 'resolved') throw new Error('Expected Alice');
    resolved.editor.email = 'changed@example.test';
    expect(users[0].email).toBe('alice@example.test');
  });
});
