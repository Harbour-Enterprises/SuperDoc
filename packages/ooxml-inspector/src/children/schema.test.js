import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

const SCHEMA_OBJ = {
  elements: {
    'w:p': { children: ['w:r'], attributes: {} },
  },
  attrs: {},
};
const SCHEMA_JSON = JSON.stringify(SCHEMA_OBJ);

let envBackup;

beforeEach(() => {
  envBackup = { ...process.env };
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = envBackup;
  vi.restoreAllMocks();
});

/**
 * Helper to set up fs/generator mocks per test case and then import the module under test.
 * Uses vi.doMock so the factory closes over per-call variables.
 *
 * @param {Object} opts
 * @param {(p: string) => boolean} [opts.exists] - implementation for existsSync
 * @param {string} [opts.readJson] - JSON content to return from readFileSync for the bundled file
 * @param {Object} [opts.buildResult] - object returned by buildFromXsdDir
 */
async function importWithMocks({ exists, readJson = SCHEMA_JSON, buildResult = SCHEMA_OBJ } = {}) {
  const existsFn = exists ?? (() => false);

  vi.doMock('node:fs', async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      readFileSync: vi.fn((path, enc) => {
        // Return JSON whenever the loader reads the bundled path
        if (typeof path === 'string' && path.endsWith('schema.transitional.json')) {
          return readJson;
        }
        return readJson;
      }),
      writeFileSync: vi.fn(),
      existsSync: vi.fn((p) => existsFn(p)),
      mkdirSync: vi.fn(),
      readdirSync: vi.fn(() => []),
    };
  });

  const generatorMock = {
    runGenerator: vi.fn(),
    buildFromXsdDir: vi.fn(() => buildResult),
  };

  try {
    vi.doMock('../../generator/src/index.js', () => generatorMock);
  } catch {}
  try {
    vi.doMock('../generator/index.js', () => generatorMock);
  } catch {}

  // Import module under test AFTER mocks
  const mod = await import('./index.js');
  const fs = await import('node:fs');

  // Import whichever generator path got used (first one that exists)
  let gen;
  try {
    gen = await import('../../generator/src/index.js');
  } catch {
    try {
      gen = await import('../generator/index.js');
    } catch {
      gen = await import('./index.js');
    }
  }

  return { mod, fs, gen };
}

describe('getSchema', () => {
  it('fast path: loads bundled JSON when packaged schema exists (and caches)', async () => {
    const { mod, fs, gen } = await importWithMocks({
      // Pretend the bundled JSON exists wherever the module resolves it
      exists: (p) => typeof p === 'string' && p.endsWith('schema.transitional.json'),
      readJson: SCHEMA_JSON,
    });

    const first = mod.getSchema();
    expect(first).toEqual(SCHEMA_OBJ);

    // readFileSync called once, on a path ending with schema.transitional.json
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync.mock.calls[0][0].endsWith('schema.transitional.json')).toBe(true);
    expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringMatching(/schema\.transitional\.json$/), 'utf8');

    expect(gen.buildFromXsdDir).not.toHaveBeenCalled();
    expect(fs.mkdirSync).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();

    const second = mod.getSchema();
    expect(second).toBe(first);
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
  });

  it('dev path via opts.xsdDir: builds schema, writes bundled JSON next to module, returns object', async () => {
    const XSD_DIR = '/tmp/ooxml-xsd';
    const buildResult = {
      elements: { 'w:body': { children: ['w:p'], attributes: {} } },
      attrs: {},
    };
    const { mod, fs, gen } = await importWithMocks({
      exists: (p) => p === XSD_DIR, // XSD dir exists; bundled JSON does NOT
      buildResult,
    });

    const got = mod.getSchema({ xsdDir: XSD_DIR });
    expect(gen.buildFromXsdDir).toHaveBeenCalledWith(XSD_DIR);

    // mkdirSync likely called with module dir (not 'dist'); we just assert it got called
    expect(fs.mkdirSync).toHaveBeenCalled();

    // Write should target a file that ends with schema.transitional.json and contain the built JSON
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const [writePath, writeData] = fs.writeFileSync.mock.calls[0];
    expect(typeof writePath).toBe('string');
    expect(writePath.endsWith('schema.transitional.json')).toBe(true);
    expect(writeData).toBe(JSON.stringify(got));

    expect(got).toEqual(buildResult);

    // Cached on second call
    const again = mod.getSchema({ xsdDir: XSD_DIR });
    expect(again).toBe(got);
    expect(gen.buildFromXsdDir).toHaveBeenCalledTimes(1);
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
  });

  it('dev path via env.OOXML_XSD_DIR: builds schema when bundled JSON missing and env dir exists', async () => {
    const XSD_DIR = '/env/xsd';
    process.env.OOXML_XSD_DIR = XSD_DIR;

    const { mod, fs, gen } = await importWithMocks({
      exists: (p) => p === XSD_DIR, // bundled JSON is missing; only env dir exists
    });

    const got = mod.getSchema();
    expect(gen.buildFromXsdDir).toHaveBeenCalledWith(XSD_DIR);
    expect(fs.mkdirSync).toHaveBeenCalled();

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const [writePath, writeData] = fs.writeFileSync.mock.calls[0];
    expect(writePath.endsWith('schema.transitional.json')).toBe(true);
    expect(writeData).toBe(JSON.stringify(got));

    expect(got).toEqual(SCHEMA_OBJ);
  });

  it('failure path: throws clear error when no bundled JSON and no xsd dir', async () => {
    const { mod, fs, gen } = await importWithMocks({
      exists: () => false, // neither bundled JSON nor XSD dir
    });

    expect(() => mod.getSchema()).toThrowError(/No schema JSON found/i);
    expect(fs.readFileSync).not.toHaveBeenCalled();
    expect(gen.buildFromXsdDir).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});

describe('loadSchemaSync', () => {
  it('reads bundled file when it exists (no generator run)', async () => {
    const { mod, fs, gen } = await importWithMocks({
      exists: (p) => typeof p === 'string' && p.endsWith('schema.transitional.json'),
      readJson: SCHEMA_JSON,
    });

    const got = mod.loadSchemaSync();
    expect(got).toEqual(SCHEMA_OBJ);

    // existsSync called on a path ending with the schema name
    expect(
      fs.existsSync.mock.calls.some(([p]) => typeof p === 'string' && p.endsWith('schema.transitional.json')),
    ).toBe(true);

    expect(gen.runGenerator).not.toHaveBeenCalled();
    expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringMatching(/schema\.transitional\.json$/), 'utf8');
  });

  it('throws when bundled missing and no env dir (no rebuild path)', async () => {
    const { mod } = await importWithMocks({
      exists: () => false,
      readJson: SCHEMA_JSON,
    });

    expect(() => mod.loadSchemaSync()).toThrow(/No schema JSON found/i);
  });
});
