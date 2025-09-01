import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('node:fs', () => {
  return {
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

// Mock the sibling module that runGenerator imports from
const buildFromXsdDirMock = vi.fn();
const XSP_DIR_VALUE = '/fake/xsp';
vi.mock('./index.js', () => ({
  XSP_DIR: XSP_DIR_VALUE,
  buildFromXsdDir: buildFromXsdDirMock,
}));

let runGenerator;
let writeFileSync, mkdirSync;

beforeEach(async () => {
  vi.resetModules();

  ({ writeFileSync, mkdirSync } = await import('node:fs'));

  // spy on console
  vi.spyOn(console, 'log').mockImplementation(() => {});

  ({ runGenerator } = await import('./generator.js'));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runGenerator', () => {
  it('generates schema, writes file, and logs sample entries for present keys', () => {
    // Arrange a schema with all the sample keys present
    const out = {
      elements: {
        'w:document': { children: [], attributes: {} },
        'w:body': { children: ['w:p'], attributes: {} },
        'w:p': { children: ['w:r'], attributes: {} },
        'w:r': { children: ['w:t'], attributes: {} },
        'w:t': { children: [], attributes: {} },
        'w:pPr': { children: ['w:spacing'], attributes: {} },
        'w:rPr': { children: [], attributes: {} },
      },
    };
    buildFromXsdDirMock.mockReturnValue(out);

    // Act
    runGenerator();

    // Assert: buildFromXsdDir called with XSP_DIR
    expect(buildFromXsdDirMock).toHaveBeenCalledTimes(1);
    expect(buildFromXsdDirMock).toHaveBeenCalledWith(XSP_DIR_VALUE);

    // Assert: mkdirSync called with recursive true
    expect(mkdirSync).toHaveBeenCalledWith('dist', { recursive: true });

    // Assert: writeFileSync to correct path with pretty-printed JSON
    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const [pathArg, dataArg] = writeFileSync.mock.calls[0];
    expect(pathArg).toBe('dist/schema.transitional.json');
    expect(dataArg).toBe(JSON.stringify(out, null, 2)); // pretty JSON

    // Assert: mkdirSync happened before writeFileSync
    const mkdirIndex = vi.mocked(mkdirSync).mock.invocationCallOrder[0];
    const writeIndex = vi.mocked(writeFileSync).mock.invocationCallOrder[0];
    expect(mkdirIndex).toBeLessThan(writeIndex);

    // Assert: logs include header + each sample entry line
    const logs = console.log.mock.calls.map((args) => args.join(' '));
    expect(logs).toContain('Wrote dist/schema.transitional.json');
    expect(logs).toContain('\nSample entries:');

    // each key should print "<key>: <len> children"
    expect(logs).toContain('w:document: 0 children');
    expect(logs).toContain('w:body: 1 children');
    expect(logs).toContain('w:p: 1 children');
    expect(logs).toContain('w:r: 1 children');
    expect(logs).toContain('w:t: 0 children');
    expect(logs).toContain('w:pPr: 1 children');
    expect(logs).toContain('w:rPr: 0 children');
  });

  it('prints "not found" for missing elements', () => {
    // Arrange a schema with some missing keys
    const out = {
      elements: {
        'w:document': { children: [], attributes: {} },
        // 'w:body' missing
        'w:p': { children: [], attributes: {} },
        'w:r': { children: [], attributes: {} },
        // 'w:t' missing
        'w:pPr': { children: [], attributes: {} },
        // 'w:rPr' missing
      },
    };
    buildFromXsdDirMock.mockReturnValue(out);

    runGenerator();

    const logs = console.log.mock.calls.map((args) => args.join(' '));
    // present keys show count
    expect(logs).toContain('w:document: 0 children');
    expect(logs).toContain('w:p: 0 children');
    expect(logs).toContain('w:r: 0 children');
    expect(logs).toContain('w:pPr: 0 children');

    // missing keys show "not found"
    expect(logs).toContain('w:body: not found children');
    expect(logs).toContain('w:t: not found children');
    expect(logs).toContain('w:rPr: not found children');
  });
});
