import { groupChanges } from '../../helpers/group-changes.js';

describe('Group changes helper', () => {
  it('groupChanges should combine replace transactions into one', () => {
    const changes = [
      {
        mark: {
          type: {
            name: 'trackDelete',
          },
          attrs: {
            id: '0',
            author: 'Superdoc User',
            authorEmail: 'undefined',
            date: '2024-12-20T04:20:00Z',
            importedAuthor: 'Superdoc User (imported)',
          },
        },
        from: 46,
        to: 51,
      },
      {
        mark: {
          type: {
            name: 'trackInsert',
          },
          attrs: {
            id: '1',
            author: 'Superdoc User',
            authorEmail: 'undefined',
            date: '2024-12-20T04:20:00Z',
            importedAuthor: 'Superdoc User (imported)',
          },
        },
        from: 52,
        to: 71,
      },
      {
        mark: {
          type: {
            name: 'trackDelete',
          },
          attrs: {
            id: '1',
            author: 'Superdoc User',
            authorEmail: 'undefined',
            date: '2024-12-20T04:20:00Z',
            importedAuthor: 'Superdoc User (imported)',
          },
        },
        from: 71,
        to: 90,
      },
      {
        mark: {
          type: {
            name: 'trackDelete',
          },
          attrs: {
            id: '2',
            author: 'Superdoc User',
            authorEmail: 'undefined',
            date: '2024-12-20T04:30:00Z',
            importedAuthor: 'Superdoc User (imported)',
          },
        },
        from: 143,
        to: 192,
      },
      {
        mark: {
          type: {
            name: 'trackInsert',
          },
          attrs: {
            id: '3',
            author: 'Superdoc User',
            authorEmail: 'undefined',
            date: '2024-12-20T04:30:00Z',
            importedAuthor: 'Superdoc User (imported)',
          },
        },
        from: 192,
        to: 196,
      },
      {
        mark: {
          type: {
            name: 'trackInsert',
          },
          attrs: {
            id: '4',
            author: 'Superdoc User',
            authorEmail: 'undefined',
            date: '2024-12-20T04:40:00Z',
            importedAuthor: 'Superdoc User (imported)',
          },
        },
        from: 196,
        to: 264,
      },
    ];

    const groupedChanges = groupChanges(changes);
    expect(groupedChanges.length).toBe(5);
    expect(groupedChanges[0]).toHaveProperty('deletionMark');
    expect(groupedChanges[0]).not.toHaveProperty('insertedMark');
    expect(groupedChanges[1]).toHaveProperty('insertedMark');
    expect(groupedChanges[1]).toHaveProperty('deletionMark');
    expect(groupedChanges[2]).toHaveProperty('deletionMark');
    expect(groupedChanges[2]).not.toHaveProperty('insertedMark');
  });
});
