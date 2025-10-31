import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHeaderFooterRepository } from '../../extensions/pagination/header-footer-repository.js';

const buildMockConverter = () => ({
  headerIds: {
    ids: ['h-default', 'h-even'],
    default: 'h-default',
    even: 'h-even',
  },
  footerIds: {
    ids: ['f-default'],
    default: 'f-default',
  },
  headers: {
    'h-default': { type: 'doc', content: [{ type: 'paragraph', content: [] }] },
    'h-even': { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Even' }] }] },
  },
  footers: {
    'f-default': { type: 'doc', content: [{ type: 'paragraph', content: [] }] },
  },
});

describe('headerFooterRepository', () => {
  let converter;
  let logger;

  beforeEach(() => {
    converter = buildMockConverter();
    logger = { warn: vi.fn() };
  });

  it('seeds header and footer records from converter', () => {
    const repo = createHeaderFooterRepository({ converter, logger });

    const headers = repo.list('header');
    const footers = repo.list('footer');

    expect(headers).toHaveLength(2);
    expect(footers).toHaveLength(1);

    expect(repo.getByVariant('header', 'default')?.id).toBe('h-default');
    expect(repo.getByVariant('header', 'even')?.id).toBe('h-even');
    expect(repo.getByVariant('footer', 'default')?.id).toBe('f-default');
  });

  it('updates content JSON and keeps converter in sync', () => {
    const repo = createHeaderFooterRepository({ converter, logger });

    const nextContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated' }] }] };
    repo.update('h-default', { contentJson: nextContent });

    expect(repo.get('h-default')?.contentJson).toEqual(nextContent);
    expect(converter.headers['h-default']).toEqual(nextContent);
    expect(repo.isDirty('h-default')).toBe(true);
  });

  it('caches height and invalidates when marked dirty', async () => {
    const repo = createHeaderFooterRepository({ converter, logger });
    const measureFn = vi.fn().mockResolvedValue(120);

    const firstHeight = await repo.ensureMeasured('h-default', measureFn);
    expect(firstHeight).toBe(120);
    expect(measureFn).toHaveBeenCalledTimes(1);

    const cachedHeight = await repo.ensureMeasured('h-default', measureFn);
    expect(cachedHeight).toBe(120);
    expect(measureFn).toHaveBeenCalledTimes(1);

    repo.markDirty('h-default');
    measureFn.mockResolvedValueOnce(150);

    const remeasuredHeight = await repo.ensureMeasured('h-default', measureFn);
    expect(remeasuredHeight).toBe(150);
    expect(measureFn).toHaveBeenCalledTimes(2);
  });

  it('assigns new variant keys to existing records', () => {
    const repo = createHeaderFooterRepository({ converter, logger });

    repo.assignVariant('header', 'first', 'h-default');
    expect(repo.getByVariant('header', 'first')?.id).toBe('h-default');
    expect(converter.headerIds.first).toBe('h-default');
  });

  it('stores temporary runtime values', () => {
    const repo = createHeaderFooterRepository({ converter, logger });
    repo.setRuntime('foo', 123);
    expect(repo.getRuntime('foo')).toBe(123);
    repo.setRuntime('foo', null);
    expect(repo.getRuntime('foo')).toBeUndefined();
    repo.setRuntime('bar', 'baz');
    repo.clearRuntime();
    expect(repo.getRuntime('bar')).toBeUndefined();
  });

  describe('legacy variant alias resolution', () => {
    it('resolves legacy "firstpage" alias to "first" variant for headers', () => {
      const customConverter = {
        headerIds: {
          ids: ['h-first'],
          firstpage: 'h-first',
        },
        headers: {
          'h-first': { type: 'doc', content: [{ type: 'paragraph' }] },
        },
        footerIds: { ids: [] },
        footers: {},
      };
      const repo = createHeaderFooterRepository({ converter: customConverter, logger });
      expect(repo.getByVariant('header', 'first')?.id).toBe('h-first');
    });

    it('resolves legacy "titlePg" alias to "first" variant', () => {
      const customConverter = {
        headerIds: {
          ids: ['h-title'],
          titlePg: 'h-title',
        },
        headers: {
          'h-title': { type: 'doc', content: [{ type: 'paragraph' }] },
        },
        footerIds: { ids: [] },
        footers: {},
      };
      const repo = createHeaderFooterRepository({ converter: customConverter, logger });
      expect(repo.getByVariant('header', 'first')?.id).toBe('h-title');
    });

    it('resolves legacy "evenpage" alias to "even" variant', () => {
      const customConverter = {
        footerIds: {
          ids: ['f-even'],
          evenpage: 'f-even',
        },
        footers: {
          'f-even': { type: 'doc', content: [{ type: 'paragraph' }] },
        },
        headerIds: { ids: [] },
        headers: {},
      };
      const repo = createHeaderFooterRepository({ converter: customConverter, logger });
      expect(repo.getByVariant('footer', 'even')?.id).toBe('f-even');
    });

    it('resolves legacy "oddpage" alias to "odd" variant', () => {
      const customConverter = {
        headerIds: {
          ids: ['h-odd'],
          oddpage: 'h-odd',
        },
        headers: {
          'h-odd': { type: 'doc', content: [{ type: 'paragraph' }] },
        },
        footerIds: { ids: [] },
        footers: {},
      };
      const repo = createHeaderFooterRepository({ converter: customConverter, logger });
      expect(repo.getByVariant('header', 'odd')?.id).toBe('h-odd');
    });

    it('resolves legacy "body" alias to "default" variant', () => {
      const customConverter = {
        headerIds: {
          ids: ['h-body'],
          body: 'h-body',
        },
        headers: {
          'h-body': { type: 'doc', content: [{ type: 'paragraph' }] },
        },
        footerIds: { ids: [] },
        footers: {},
      };
      const repo = createHeaderFooterRepository({ converter: customConverter, logger });
      expect(repo.getByVariant('header', 'default')?.id).toBe('h-body');
    });

    it('resolves legacy "normal" alias to "default" variant', () => {
      const customConverter = {
        footerIds: {
          ids: ['f-normal'],
          normal: 'f-normal',
        },
        footers: {
          'f-normal': { type: 'doc', content: [{ type: 'paragraph' }] },
        },
        headerIds: { ids: [] },
        headers: {},
      };
      const repo = createHeaderFooterRepository({ converter: customConverter, logger });
      expect(repo.getByVariant('footer', 'default')?.id).toBe('f-normal');
    });

    it('resolves "last" variant for footers', () => {
      const customConverter = {
        footerIds: {
          ids: ['f-last'],
          last: 'f-last',
        },
        footers: {
          'f-last': { type: 'doc', content: [{ type: 'paragraph' }] },
        },
        headerIds: { ids: [] },
        headers: {},
      };
      const repo = createHeaderFooterRepository({ converter: customConverter, logger });
      expect(repo.getByVariant('footer', 'last')?.id).toBe('f-last');
    });

    it('resolves case-insensitive variant keys like "EvenPage"', () => {
      const customConverter = {
        headerIds: {
          ids: ['h-even'],
          EvenPage: 'h-even',
        },
        headers: {
          'h-even': { type: 'doc', content: [{ type: 'paragraph' }] },
        },
        footerIds: { ids: [] },
        footers: {},
      };
      const repo = createHeaderFooterRepository({ converter: customConverter, logger });
      expect(repo.getByVariant('header', 'even')?.id).toBe('h-even');
    });

    it('resolves "headerRid" pattern to default variant', () => {
      const customConverter = {
        headerIds: {
          ids: ['h-rid'],
          headerRid: 'h-rid',
        },
        headers: {
          'h-rid': { type: 'doc', content: [{ type: 'paragraph' }] },
        },
        footerIds: { ids: [] },
        footers: {},
      };
      const repo = createHeaderFooterRepository({ converter: customConverter, logger });
      expect(repo.getByVariant('header', 'default')?.id).toBe('h-rid');
    });

    it('resolves "footerRid" pattern to default variant', () => {
      const customConverter = {
        footerIds: {
          ids: ['f-rid'],
          footerRid: 'f-rid',
        },
        footers: {
          'f-rid': { type: 'doc', content: [{ type: 'paragraph' }] },
        },
        headerIds: { ids: [] },
        headers: {},
      };
      const repo = createHeaderFooterRepository({ converter: customConverter, logger });
      expect(repo.getByVariant('footer', 'default')?.id).toBe('f-rid');
    });

    it('resolves standalone "header" key to default variant', () => {
      const customConverter = {
        headerIds: {
          ids: ['h-header'],
          header: 'h-header',
        },
        headers: {
          'h-header': { type: 'doc', content: [{ type: 'paragraph' }] },
        },
        footerIds: { ids: [] },
        footers: {},
      };
      const repo = createHeaderFooterRepository({ converter: customConverter, logger });
      expect(repo.getByVariant('header', 'default')?.id).toBe('h-header');
    });

    it('resolves standalone "footer" key to default variant', () => {
      const customConverter = {
        footerIds: {
          ids: ['f-footer'],
          footer: 'f-footer',
        },
        footers: {
          'f-footer': { type: 'doc', content: [{ type: 'paragraph' }] },
        },
        headerIds: { ids: [] },
        headers: {},
      };
      const repo = createHeaderFooterRepository({ converter: customConverter, logger });
      expect(repo.getByVariant('footer', 'default')?.id).toBe('f-footer');
    });

    it('prioritizes canonical keys over legacy aliases', () => {
      const customConverter = {
        headerIds: {
          ids: ['h-default', 'h-body'],
          default: 'h-default',
          body: 'h-body',
        },
        headers: {
          'h-default': { type: 'doc', content: [{ type: 'paragraph' }] },
          'h-body': { type: 'doc', content: [{ type: 'paragraph' }] },
        },
        footerIds: { ids: [] },
        footers: {},
      };
      const repo = createHeaderFooterRepository({ converter: customConverter, logger });
      expect(repo.getByVariant('header', 'default')?.id).toBe('h-default');
    });

    it('tracks multiple variants assigned to same record', () => {
      const customConverter = {
        headerIds: {
          ids: ['h-multi'],
          default: 'h-multi',
          first: 'h-multi',
        },
        headers: {
          'h-multi': { type: 'doc', content: [{ type: 'paragraph' }] },
        },
        footerIds: { ids: [] },
        footers: {},
      };
      const repo = createHeaderFooterRepository({ converter: customConverter, logger });
      const record = repo.get('h-multi');
      expect(record?.meta.variants).toContain('default');
      expect(record?.meta.variants).toContain('first');
    });
  });

  describe('error handling', () => {
    it('throws when creating repository without converter', () => {
      expect(() => createHeaderFooterRepository()).toThrow(
        'createHeaderFooterRepository requires a converter instance',
      );
      expect(() => createHeaderFooterRepository({})).toThrow(
        'createHeaderFooterRepository requires a converter instance',
      );
    });

    it('throws when assigning variant to unknown type', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      expect(() => repo.assignVariant('invalid-type', 'default', 'h-default')).toThrow('Unknown type: invalid-type');
    });

    it('throws when assigning variant to unknown id', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      expect(() => repo.assignVariant('header', 'default', 'unknown-id')).toThrow(
        'Cannot assign variant to unknown id: unknown-id',
      );
    });

    it('throws when calling list with unknown type', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      expect(() => repo.list('invalid-type')).toThrow('Unknown type: invalid-type');
    });

    it('throws when calling getByVariant with unknown type', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      expect(() => repo.getByVariant('invalid-type', 'default')).toThrow('Unknown type: invalid-type');
    });

    it('throws when ensureMeasured is called without a function', async () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      await expect(repo.ensureMeasured('h-default', null)).rejects.toThrow(
        'ensureMeasured requires a measureFn callback',
      );
      await expect(repo.ensureMeasured('h-default', 'not-a-function')).rejects.toThrow(
        'ensureMeasured requires a measureFn callback',
      );
    });

    it('warns when setHeight receives invalid height value', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      repo.setHeight('h-default', NaN);
      expect(logger.warn).toHaveBeenCalledWith('[headerFooterRepository] setHeight received invalid value', {
        id: 'h-default',
        heightPx: NaN,
      });
    });

    it('warns when setHeight receives Infinity', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      repo.setHeight('h-default', Infinity);
      expect(logger.warn).toHaveBeenCalledWith('[headerFooterRepository] setHeight received invalid value', {
        id: 'h-default',
        heightPx: Infinity,
      });
    });

    it('warns when measureFn returns non-finite value', async () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      const measureFn = vi.fn().mockResolvedValue(NaN);
      await repo.ensureMeasured('h-default', measureFn);
      expect(logger.warn).toHaveBeenCalledWith(
        '[headerFooterRepository] measureFn returned non-finite value',
        expect.objectContaining({ id: 'h-default', nextHeight: NaN }),
      );
    });
  });

  describe('edge cases', () => {
    it('returns null when getting non-existent id', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      expect(repo.get('non-existent')).toBeNull();
    });

    it('returns null when getting variant that is not assigned', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      expect(repo.getByVariant('header', 'odd')).toBeNull();
    });

    it('returns null when updating non-existent id', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      const result = repo.update('non-existent', { contentJson: {} });
      expect(result).toBeNull();
    });

    it('returns null when setting height for non-existent id', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      const result = repo.setHeight('non-existent', 100);
      expect(result).toBeNull();
    });

    it('returns null when marking non-existent id as dirty', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      const result = repo.markDirty('non-existent');
      expect(result).toBeNull();
    });

    it('returns false when checking if non-existent id is dirty', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      expect(repo.isDirty('non-existent')).toBe(false);
    });

    it('returns null when getting height for non-existent id', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      expect(repo.getHeight('non-existent')).toBeNull();
    });

    it('returns null when ensuring measurement for non-existent id', async () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      const measureFn = vi.fn().mockResolvedValue(100);
      const result = await repo.ensureMeasured('non-existent', measureFn);
      expect(result).toBeNull();
      expect(measureFn).not.toHaveBeenCalled();
    });

    it('handles update with only meta changes (no contentJson)', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      const result = repo.update('h-default', { meta: { customProp: 'value' } });
      expect(result?.meta.customProp).toBe('value');
      expect(repo.isDirty('h-default')).toBe(false);
    });

    it('handles update with both contentJson and meta', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      const nextContent = { type: 'doc', content: [] };
      const result = repo.update('h-default', {
        contentJson: nextContent,
        meta: { customProp: 'value' },
      });
      expect(result?.contentJson).toEqual(nextContent);
      expect(result?.meta.customProp).toBe('value');
      expect(repo.isDirty('h-default')).toBe(true);
    });

    it('preserves existing meta when updating', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      repo.update('h-default', { meta: { prop1: 'value1' } });
      repo.update('h-default', { meta: { prop2: 'value2' } });
      const record = repo.get('h-default');
      expect(record?.meta.prop1).toBe('value1');
      expect(record?.meta.prop2).toBe('value2');
    });

    it('handles malformed converter with missing headerIds', () => {
      const malformedConverter = {
        headers: {
          'h-orphan': { type: 'doc', content: [] },
        },
        footerIds: { ids: [] },
        footers: {},
      };
      const repo = createHeaderFooterRepository({ converter: malformedConverter, logger });
      expect(repo.list('header')).toHaveLength(0);
    });

    it('handles malformed converter with non-array ids', () => {
      const malformedConverter = {
        headerIds: {
          ids: 'not-an-array',
          default: 'h-default',
        },
        headers: {
          'h-default': { type: 'doc', content: [] },
        },
        footerIds: { ids: [] },
        footers: {},
      };
      const repo = createHeaderFooterRepository({ converter: malformedConverter, logger });
      expect(repo.list('header')).toHaveLength(0);
    });

    it('skips records when content is missing from converter', () => {
      const partialConverter = {
        headerIds: {
          ids: ['h-exists', 'h-missing'],
          default: 'h-exists',
        },
        headers: {
          'h-exists': { type: 'doc', content: [] },
        },
        footerIds: { ids: [] },
        footers: {},
      };
      const repo = createHeaderFooterRepository({ converter: partialConverter, logger });
      expect(repo.list('header')).toHaveLength(1);
      expect(repo.get('h-exists')).not.toBeNull();
      expect(repo.get('h-missing')).toBeNull();
    });

    it('does not warn when getting non-existent id', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      repo.get('non-existent');
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('keeps height null when setHeight receives invalid value', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      repo.setHeight('h-default', 100);
      repo.setHeight('h-default', NaN);
      expect(repo.getHeight('h-default')).toBe(100);
    });

    it('keeps heightPx null when measureFn returns non-finite', async () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      const measureFn = vi.fn().mockResolvedValue(Infinity);
      const result = await repo.ensureMeasured('h-default', measureFn);
      expect(result).toBeNull();
      expect(repo.getHeight('h-default')).toBeNull();
    });
  });

  describe('uncovered methods', () => {
    it('toJSON returns headers and footers arrays', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      const json = repo.toJSON();
      expect(json).toHaveProperty('headers');
      expect(json).toHaveProperty('footers');
      expect(Array.isArray(json.headers)).toBe(true);
      expect(Array.isArray(json.footers)).toBe(true);
      expect(json.headers).toHaveLength(2);
      expect(json.footers).toHaveLength(1);
    });

    it('toJSON returns full record objects', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      const json = repo.toJSON();
      const firstHeader = json.headers[0];
      expect(firstHeader).toHaveProperty('id');
      expect(firstHeader).toHaveProperty('type');
      expect(firstHeader).toHaveProperty('contentJson');
      expect(firstHeader).toHaveProperty('meta');
      expect(firstHeader).toHaveProperty('heightPx');
      expect(firstHeader).toHaveProperty('dirty');
    });

    it('getHeight returns cached height', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      repo.setHeight('h-default', 150);
      expect(repo.getHeight('h-default')).toBe(150);
    });

    it('getHeight returns null when no height is set', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      expect(repo.getHeight('h-default')).toBeNull();
    });

    it('list without type parameter returns all records', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      const allRecords = repo.list();
      expect(allRecords).toHaveLength(3);
      const headerCount = allRecords.filter((r) => r.type === 'header').length;
      const footerCount = allRecords.filter((r) => r.type === 'footer').length;
      expect(headerCount).toBe(2);
      expect(footerCount).toBe(1);
    });

    it('list with type parameter filters records', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      const headers = repo.list('header');
      const footers = repo.list('footer');
      expect(headers.every((r) => r.type === 'header')).toBe(true);
      expect(footers.every((r) => r.type === 'footer')).toBe(true);
    });
  });

  describe('complex seeding logic', () => {
    it('resolves additional variants from converter keys using pattern matching', () => {
      const customConverter = {
        headerIds: {
          ids: ['h-custom'],
          CustomFirstPage: 'h-custom',
        },
        headers: {
          'h-custom': { type: 'doc', content: [] },
        },
        footerIds: { ids: [] },
        footers: {},
      };
      const repo = createHeaderFooterRepository({ converter: customConverter, logger });
      expect(repo.getByVariant('header', 'first')?.id).toBe('h-custom');
    });

    it('resolves additional variants only if canonical not already assigned', () => {
      const customConverter = {
        headerIds: {
          ids: ['h-first', 'h-alternate'],
          first: 'h-first',
          AlternateFirstPage: 'h-alternate',
        },
        headers: {
          'h-first': { type: 'doc', content: [] },
          'h-alternate': { type: 'doc', content: [] },
        },
        footerIds: { ids: [] },
        footers: {},
      };
      const repo = createHeaderFooterRepository({ converter: customConverter, logger });
      expect(repo.getByVariant('header', 'first')?.id).toBe('h-first');
    });

    it('ignores unrecognized variant keys during additional resolution', () => {
      const customConverter = {
        headerIds: {
          ids: ['h-default'],
          default: 'h-default',
          unrecognizedKey: 'h-default',
        },
        headers: {
          'h-default': { type: 'doc', content: [] },
        },
        footerIds: { ids: [] },
        footers: {},
      };
      const repo = createHeaderFooterRepository({ converter: customConverter, logger });
      const record = repo.get('h-default');
      expect(record?.meta.variants).not.toContain('unrecognizedKey');
    });

    it('syncs variant assignment back to converter.headerIds', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      repo.assignVariant('header', 'odd', 'h-default');
      expect(converter.headerIds.odd).toBe('h-default');
    });

    it('syncs variant assignment back to converter.footerIds', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      repo.assignVariant('footer', 'first', 'f-default');
      expect(converter.footerIds.first).toBe('f-default');
    });

    it('does not duplicate variant in meta.variants when assigning same variant twice', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      repo.assignVariant('header', 'first', 'h-default');
      repo.assignVariant('header', 'first', 'h-default');
      const record = repo.get('h-default');
      const firstCount = record?.meta.variants?.filter((v) => v === 'first').length;
      expect(firstCount).toBe(1);
    });

    it('initializes records with clean state (dirty=false, heightPx=null)', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      const record = repo.get('h-default');
      expect(record?.dirty).toBe(false);
      expect(record?.heightPx).toBeNull();
    });

    it('syncs contentJson updates back to converter collection', () => {
      const repo = createHeaderFooterRepository({ converter, logger });
      const newContent = { type: 'doc', content: [{ type: 'text', text: 'new' }] };
      repo.update('h-default', { contentJson: newContent });
      expect(converter.headers['h-default']).toEqual(newContent);
    });

    it('creates converter collection if missing during update', () => {
      const minimalConverter = {
        headerIds: {
          ids: ['h-new'],
        },
        headers: {
          'h-new': { type: 'doc', content: [] },
        },
        footerIds: { ids: ['f-new'] },
        footers: {
          'f-new': { type: 'doc', content: [] },
        },
      };
      const repo = createHeaderFooterRepository({ converter: minimalConverter, logger });
      const newContent = { type: 'doc', content: [{ type: 'text', text: 'footer' }] };

      delete minimalConverter.footers;
      repo.update('f-new', { contentJson: newContent });
      expect(minimalConverter.footers).toBeDefined();
      expect(minimalConverter.footers['f-new']).toEqual(newContent);
    });
  });
});
