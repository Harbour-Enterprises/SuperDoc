import { describe, it, expect } from 'vitest';
import { buildNumberingCache, ensureNumberingCache, getNumberingCache, LEVELS_MAP_KEY } from './numberingCache.js';

const createDocxPackage = ({ abstractId = '1', templateId = 'tmpl-1', numId = '8', includeLevels = true } = {}) => {
  const abstractElements = [];
  if (templateId != null) {
    abstractElements.push({ name: 'w:tmpl', attributes: { 'w:val': templateId } });
  }
  if (includeLevels) {
    abstractElements.push({ name: 'w:lvl', attributes: { 'w:ilvl': '0' } });
    abstractElements.push({ name: 'w:lvl', attributes: { 'w:ilvl': '1' } });
  }

  return {
    'word/numbering.xml': {
      elements: [
        {
          elements: [
            {
              name: 'w:abstractNum',
              attributes: { 'w:abstractNumId': String(abstractId) },
              elements: abstractElements,
            },
            {
              name: 'w:num',
              attributes: { 'w:numId': String(numId) },
              elements: [{ name: 'w:abstractNumId', attributes: { 'w:val': String(abstractId) } }],
            },
          ],
        },
      ],
    },
  };
};

const expectEmptyCache = (cache) => {
  expect(cache.numToAbstractId.size).toBe(0);
  expect(cache.abstractById.size).toBe(0);
  expect(cache.templateById.size).toBe(0);
  expect(cache.numToDefinition.size).toBe(0);
  expect(cache.numNodesById.size).toBe(0);
};

describe('numbering cache helpers', () => {
  it('returns empty cache when provided docx package is invalid', () => {
    expectEmptyCache(buildNumberingCache(null));
    expectEmptyCache(buildNumberingCache(undefined));
    expectEmptyCache(buildNumberingCache(42));
  });

  it('builds cache relationships and memoizes levels when numbering definitions are present', () => {
    const docx = createDocxPackage();
    const cache = buildNumberingCache(docx);

    expect(cache.numToAbstractId.get('8')).toBe('1');

    const abstract = cache.abstractById.get('1');
    expect(abstract).toBe(docx['word/numbering.xml'].elements[0].elements[0]);

    const levelsMap = abstract[LEVELS_MAP_KEY];
    expect(levelsMap).toBeInstanceOf(Map);
    expect(levelsMap.get(0)?.attributes?.['w:ilvl']).toBe('0');
    expect(levelsMap.get(1)?.attributes?.['w:ilvl']).toBe('1');
    expect(Object.prototype.propertyIsEnumerable.call(abstract, LEVELS_MAP_KEY)).toBe(false);

    expect(cache.templateById.get('tmpl-1')).toBe(abstract);
    expect(cache.numToDefinition.get('8')).toBe(abstract);

    const numNode = cache.numNodesById.get('8');
    expect(numNode?.attributes?.['w:numId']).toBe('8');
  });

  it('skips template caching when abstract levels are missing', () => {
    const docx = createDocxPackage({ includeLevels: false });
    const cache = buildNumberingCache(docx);

    expect(cache.templateById.size).toBe(0);
    expect(cache.numToDefinition.get('8')).toBe(cache.abstractById.get('1'));

    const abstract = cache.abstractById.get('1');
    const levelsMap = abstract[LEVELS_MAP_KEY];
    expect(levelsMap.size).toBe(0);
  });

  it('falls back to the base numbering definition when numbering xml is missing', () => {
    const cache = buildNumberingCache({});
    expect(cache.abstractById.size).toBeGreaterThan(0);
    expect(cache.numNodesById.size).toBeGreaterThan(0);
  });

  it('memoizes cache instances for the same docx package without mutating it', () => {
    const docx = createDocxPackage();

    const firstCache = ensureNumberingCache(docx);
    const secondCache = ensureNumberingCache(docx);
    expect(secondCache).toBe(firstCache);
    expect(Object.prototype.hasOwnProperty.call(docx, 'numbering-cache')).toBe(false);
    expect(getNumberingCache(docx)).toBe(firstCache);
  });

  it('returns empty cache when ensureNumberingCache receives invalid input', () => {
    expectEmptyCache(ensureNumberingCache(null));
    expectEmptyCache(ensureNumberingCache(undefined));
  });

  it('reads cached instances through getNumberingCache', () => {
    const docx = createDocxPackage();
    const cache = ensureNumberingCache(docx);

    expect(getNumberingCache(docx)).toBe(cache);
    expectEmptyCache(getNumberingCache(null));
  });
});
