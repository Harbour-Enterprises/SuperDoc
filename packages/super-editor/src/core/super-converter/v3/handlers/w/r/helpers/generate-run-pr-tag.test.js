import { describe, it, expect } from 'vitest';
import { generateRunPrTag } from './generate-run-pr-tag.js';

describe('generateRunPrTag', () => {
  it('returns null when no props or empty object provided', () => {
    expect(generateRunPrTag()).toBeNull();
    expect(generateRunPrTag({})).toBeNull();
  });

  it('builds w:rPr with elements from object-bag props', () => {
    const props = {
      bold: { xmlName: 'w:b', attributes: { 'w:val': '1' } },
      italic: { xmlName: 'w:i' },
      // entry without xmlName should be ignored
      missing: { attributes: { foo: 'bar' } },
    };

    const tag = generateRunPrTag(props);

    expect(tag).toBeTruthy();
    expect(tag.name).toBe('w:rPr');
    // Order follows Object.keys iteration of the bag
    expect(tag.elements).toEqual([
      { name: 'w:b', attributes: { 'w:val': '1' } },
      // note: attributes is undefined when not provided in object-bag form
      { name: 'w:i', attributes: undefined },
    ]);
  });

  it('builds w:rPr with elements from array of entries', () => {
    const entries = [
      { xmlName: 'w:u', attributes: { 'w:val': 'single' } },
      // allow `name` as a lenient alias for `xmlName`
      { name: 'w:color', attributes: { 'w:val': 'FF0000' } },
      // attributes default to an empty object in array mode
      { xmlName: 'w:vanish' },
      // invalid entries are ignored
      null,
      {},
      { attributes: { foo: 'bar' } },
    ];

    const tag = generateRunPrTag(entries);

    expect(tag).toBeTruthy();
    expect(tag.name).toBe('w:rPr');
    expect(tag.elements).toEqual([
      { name: 'w:u', attributes: { 'w:val': 'single' } },
      { name: 'w:color', attributes: { 'w:val': 'FF0000' } },
      { name: 'w:vanish', attributes: {} },
    ]);
  });

  it('returns null when no valid entries are found in array', () => {
    const tag = generateRunPrTag([null, {}, { attributes: { a: 1 } }]);
    expect(tag).toBeNull();
  });
});
