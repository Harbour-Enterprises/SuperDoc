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
});
