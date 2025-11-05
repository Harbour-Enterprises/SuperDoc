import { describe, it, expect } from 'vitest';
import { getLargestRelationshipId, mergeRelationshipElements } from './relationship-helpers.js';

const IMAGE_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
const HEADER_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/header';

const buildRelationship = ({ Id, Target, Type = IMAGE_REL_TYPE }) => ({
  type: 'element',
  name: 'Relationship',
  attributes: {
    Id,
    Type,
    Target,
  },
});

describe('getLargestRelationshipId', () => {
  it('returns 0 when no relationships with numeric ids exist', () => {
    expect(getLargestRelationshipId([])).toBe(0);
    expect(getLargestRelationshipId([buildRelationship({ Id: 'invalid', Target: 'media/foo.png' })])).toBe(0);
  });

  it('detects the highest numeric id regardless of prefix format', () => {
    const relationships = [
      buildRelationship({ Id: 'rId7', Target: 'media/one.png' }),
      buildRelationship({ Id: 'mi42', Target: 'media/two.png' }),
      buildRelationship({ Id: 'rId105', Target: 'media/three.png' }),
    ];

    expect(getLargestRelationshipId(relationships)).toBe(105);
  });
});

describe('mergeRelationshipElements', () => {
  it('skips duplicate relationships that already exist with the same ID', () => {
    const existing = [buildRelationship({ Id: 'rId5', Target: 'media/image.png' })];
    const merged = mergeRelationshipElements(existing, [buildRelationship({ Id: 'rId5', Target: 'media/image.png' })]);
    expect(merged).toHaveLength(1);
  });

  it('preserves provided IDs for media relationships with long ids', () => {
    const existing = [buildRelationship({ Id: 'rId5', Target: 'media/image.png' })];
    const merged = mergeRelationshipElements(existing, [
      buildRelationship({ Id: 'rId1234567', Target: 'media/new.png' }),
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[1].attributes.Id).toBe('rId1234567');
  });

  it('allocates sequential ids for short, non-media relationships', () => {
    const existing = [buildRelationship({ Id: 'rId3', Target: 'media/one.png' })];
    const merged = mergeRelationshipElements(existing, [
      buildRelationship({ Id: 'rId1', Target: 'headers/header1.xml', Type: HEADER_REL_TYPE }),
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[1].attributes.Id).toBe('rId4');
  });

  it('treats escaped and unescaped media targets as duplicates', () => {
    const existing = [buildRelationship({ Id: 'rId9', Target: 'media/company&amp;logo.png' })];
    const merged = mergeRelationshipElements(existing, [
      buildRelationship({ Id: 'rId999', Target: 'media/company&logo.png' }),
    ]);

    expect(merged).toHaveLength(1);
  });
});
