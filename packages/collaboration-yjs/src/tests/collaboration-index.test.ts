import { describe, expect, test } from 'vitest';

import { SuperDocCollaboration } from '../collaboration/index.js';

describe('collaboration index', () => {
  test('re-exports SuperDocCollaboration', () => {
    expect(typeof SuperDocCollaboration).toBe('function');
  });
});
