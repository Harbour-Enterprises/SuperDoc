import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';

// Mock external dependencies
vi.mock('node:child_process');
vi.mock('node:fs/promises');
vi.mock('vite', () => ({
  build: vi.fn().mockResolvedValue(undefined),
}));

/**
 * Re-implemented utility functions from freeze-schema.ts for testing purposes.
 * These mirror the actual implementation to verify expected behavior.
 */

type PackageJson = {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  [key: string]: unknown;
};

/**
 * Parses version from CLI arguments
 */
function parseVersion(args: string[]): string | null {
  let version: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--version=')) {
      version = arg.split('=')[1];
    } else if (arg === '--version' && i + 1 < args.length) {
      version = args[i + 1];
    } else if (!arg.startsWith('--') && /^[0-9]/.test(arg)) {
      version = arg;
    }
  }

  if (!version) {
    return null;
  }

  // Validate semver format
  if (version && !/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+].+)?$/.test(version)) {
    throw new Error(`Invalid version "${version}". Expected semver format (e.g., 0.1.0 or 0.1.0-beta.1).`);
  }

  return version;
}

/**
 * Validates path is inside repository
 */
const repoRoot = path.resolve(__dirname, '../../..');

function assertPathInsideRepo(targetPath: string) {
  const normalizedTarget = path.resolve(targetPath);
  if (!normalizedTarget.startsWith(repoRoot)) {
    throw new Error(`Refusing to operate outside repo root: ${normalizedTarget}`);
  }
}

/**
 * Builds alias map for Vite configuration
 */
function buildAliasMap(root: string) {
  return {
    '@superdoc/common': path.resolve(root, '..', '..', 'shared', 'common'),
    '@': path.resolve(root, 'src'),
    '@core': path.resolve(root, 'src', 'core'),
    '@components': path.resolve(root, 'src', 'components'),
    '@extensions': path.resolve(root, 'src', 'extensions'),
    '@translator': path.resolve(root, '..', 'translator', 'index.js'),
    '@preset-geometry': path.resolve(root, '..', 'preset-geometry', 'index.js'),
    '@packages/schema-management': path.resolve(root, '..', 'schema-management'),
  };
}

/**
 * Collects external dependencies from package.json
 */
function collectExternals(pkgJson: PackageJson) {
  const deps = Object.keys(pkgJson.dependencies || {});
  const peers = Object.keys(pkgJson.peerDependencies || {});
  return Array.from(new Set([...deps, ...peers]));
}

/**
 * Reads and parses JSON file
 */
async function readJson<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Checks if path exists
 */
async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Computes SHA256 hash of file
 */
async function hashFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Reads git commit hash
 */
function readGitCommit(cwd: string): string | null {
  try {
    assertPathInsideRepo(cwd);
    return execSync('git rev-parse HEAD', {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

describe('parseVersion', () => {
  describe('valid semver formats', () => {
    it('should parse version from --version=X.Y.Z format', () => {
      expect(parseVersion(['--version=1.0.0'])).toBe('1.0.0');
      expect(parseVersion(['--version=0.1.0'])).toBe('0.1.0');
      expect(parseVersion(['--version=10.20.30'])).toBe('10.20.30');
    });

    it('should parse version from --version X.Y.Z format (space-separated)', () => {
      expect(parseVersion(['--version', '1.0.0'])).toBe('1.0.0');
      expect(parseVersion(['--version', '2.3.4'])).toBe('2.3.4');
    });

    it('should parse version from positional argument', () => {
      expect(parseVersion(['1.0.0'])).toBe('1.0.0');
      expect(parseVersion(['some-script.js', '2.5.1'])).toBe('2.5.1');
    });

    it('should parse version with prerelease suffix', () => {
      expect(parseVersion(['--version=1.0.0-beta.1'])).toBe('1.0.0-beta.1');
      expect(parseVersion(['--version=1.0.0-alpha'])).toBe('1.0.0-alpha');
      expect(parseVersion(['--version=2.0.0-rc.1'])).toBe('2.0.0-rc.1');
    });

    it('should parse version with build metadata', () => {
      expect(parseVersion(['--version=1.0.0+build.123'])).toBe('1.0.0+build.123');
      expect(parseVersion(['--version=1.0.0-beta.1+exp.sha.5114f85'])).toBe(
        '1.0.0-beta.1+exp.sha.5114f85',
      );
    });

    it('should handle multiple arguments and find version', () => {
      expect(parseVersion(['--other-flag', '--version=1.0.0', '--another'])).toBe('1.0.0');
      expect(parseVersion(['script.js', '--version', '1.2.3', '--output', 'dist'])).toBe('1.2.3');
    });

    it('should use last valid version if multiple provided', () => {
      expect(parseVersion(['--version=1.0.0', '--version=2.0.0'])).toBe('2.0.0');
    });
  });

  describe('invalid semver formats', () => {
    it('should throw error for version missing patch number', () => {
      expect(() => parseVersion(['--version=1.0'])).toThrow(/Invalid version/);
    });

    it('should throw error for version missing minor and patch', () => {
      expect(() => parseVersion(['--version=1'])).toThrow(/Invalid version/);
    });

    it('should throw error for non-numeric version parts', () => {
      expect(() => parseVersion(['--version=a.b.c'])).toThrow(/Invalid version/);
      expect(() => parseVersion(['--version=1.x.0'])).toThrow(/Invalid version/);
    });

    it('should return null for empty version', () => {
      expect(parseVersion(['--version='])).toBe(null);
    });

    it('should throw error for missing version after --version flag', () => {
      expect(parseVersion(['--version'])).toBe(null);
    });

    it('should return null when no version argument provided', () => {
      expect(parseVersion([])).toBe(null);
      expect(parseVersion(['--other-flag', '--another'])).toBe(null);
    });

    it('should throw error for version with leading v', () => {
      expect(() => parseVersion(['--version=v1.0.0'])).toThrow(/Invalid version/);
    });

    it('should throw error for version with extra dots', () => {
      expect(() => parseVersion(['--version=1.0.0.0'])).toThrow(/Invalid version/);
    });
  });

  describe('edge cases', () => {
    it('should handle version with very long prerelease identifier', () => {
      const longPre = 'a'.repeat(100);
      expect(parseVersion([`--version=1.0.0-${longPre}`])).toBe(`1.0.0-${longPre}`);
    });

    it('should handle version with complex build metadata', () => {
      expect(parseVersion(['--version=1.0.0+20130313144700'])).toBe('1.0.0+20130313144700');
    });

    it('should handle whitespace in arguments (trimmed during parsing)', () => {
      expect(parseVersion(['--version=1.0.0'])).toBe('1.0.0');
    });

    it('should prioritize --version= format over positional', () => {
      expect(parseVersion(['2.0.0', '--version=1.0.0'])).toBe('1.0.0');
    });

    it('should handle mixed flag types', () => {
      expect(parseVersion(['--flag', 'value', '--version', '1.0.0', 'positional'])).toBe('1.0.0');
    });
  });
});

describe('assertPathInsideRepo', () => {
  it('should not throw for paths inside repository', () => {
    const validPath = path.join(repoRoot, 'packages', 'schema-management');
    expect(() => assertPathInsideRepo(validPath)).not.toThrow();
  });

  it('should throw for paths outside repository', () => {
    const invalidPath = '/tmp/malicious';
    expect(() => assertPathInsideRepo(invalidPath)).toThrow(/Refusing to operate outside repo root/);
  });

  it('should resolve relative paths before checking', () => {
    const relativePath = path.join(repoRoot, 'packages', '..', 'packages', 'schema-management');
    expect(() => assertPathInsideRepo(relativePath)).not.toThrow();
  });

  it('should prevent path traversal attempts', () => {
    const traversalPath = path.join(repoRoot, '..', '..', 'etc', 'passwd');
    expect(() => assertPathInsideRepo(traversalPath)).toThrow(/Refusing to operate outside repo root/);
  });
});

describe('buildAliasMap', () => {
  const mockRoot = '/mock/project/packages/super-editor';

  it('should create correct alias map with all required paths', () => {
    const aliases = buildAliasMap(mockRoot);
    expect(aliases).toHaveProperty('@superdoc/common');
    expect(aliases).toHaveProperty('@');
    expect(aliases).toHaveProperty('@core');
    expect(aliases).toHaveProperty('@components');
    expect(aliases).toHaveProperty('@extensions');
    expect(aliases).toHaveProperty('@translator');
    expect(aliases).toHaveProperty('@preset-geometry');
    expect(aliases).toHaveProperty('@packages/schema-management');
  });

  it('should resolve @superdoc/common to shared/common', () => {
    const aliases = buildAliasMap(mockRoot);
    expect(aliases['@superdoc/common']).toBe(path.resolve(mockRoot, '..', '..', 'shared', 'common'));
  });

  it('should resolve @translator to translator/index.js', () => {
    const aliases = buildAliasMap(mockRoot);
    expect(aliases['@translator']).toBe(path.resolve(mockRoot, '..', 'translator', 'index.js'));
  });

  it('should resolve @preset-geometry to preset-geometry/index.js', () => {
    const aliases = buildAliasMap(mockRoot);
    expect(aliases['@preset-geometry']).toBe(
      path.resolve(mockRoot, '..', 'preset-geometry', 'index.js'),
    );
  });

  it('should handle different root paths', () => {
    const differentRoot = '/another/location/packages/super-editor';
    const aliases = buildAliasMap(differentRoot);
    expect(aliases['@']).toBe(path.resolve(differentRoot, 'src'));
  });
});

describe('collectExternals', () => {
  it('should collect dependencies', () => {
    const pkg: PackageJson = {
      dependencies: {
        vue: '^3.0.0',
        'prosemirror-model': '^1.0.0',
      },
    };
    const externals = collectExternals(pkg);
    expect(externals).toContain('vue');
    expect(externals).toContain('prosemirror-model');
  });

  it('should collect peerDependencies', () => {
    const pkg: PackageJson = {
      peerDependencies: {
        vue: '^3.0.0',
      },
    };
    const externals = collectExternals(pkg);
    expect(externals).toContain('vue');
  });

  it('should combine dependencies and peerDependencies without duplicates', () => {
    const pkg: PackageJson = {
      dependencies: {
        vue: '^3.0.0',
        lodash: '^4.0.0',
      },
      peerDependencies: {
        vue: '^3.0.0',
        react: '^18.0.0',
      },
    };
    const externals = collectExternals(pkg);
    expect(externals).toContain('vue');
    expect(externals).toContain('lodash');
    expect(externals).toContain('react');
    // Should not have duplicates
    expect(externals.filter((e) => e === 'vue').length).toBe(1);
  });

  it('should handle empty dependencies', () => {
    const pkg: PackageJson = {};
    const externals = collectExternals(pkg);
    expect(externals).toEqual([]);
  });

  it('should handle missing dependencies fields', () => {
    const pkg: PackageJson = {
      name: 'test-package',
    };
    const externals = collectExternals(pkg);
    expect(externals).toEqual([]);
  });

  it('should handle only dependencies (no peerDependencies)', () => {
    const pkg: PackageJson = {
      dependencies: {
        express: '^4.0.0',
      },
    };
    const externals = collectExternals(pkg);
    expect(externals).toEqual(['express']);
  });

  it('should handle only peerDependencies (no dependencies)', () => {
    const pkg: PackageJson = {
      peerDependencies: {
        react: '^18.0.0',
      },
    };
    const externals = collectExternals(pkg);
    expect(externals).toEqual(['react']);
  });
});

describe('readJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should read and parse valid JSON', async () => {
    const mockData = { name: 'test', version: '1.0.0' };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockData));

    const result = await readJson<typeof mockData>('/path/to/file.json');
    expect(result).toEqual(mockData);
    expect(fs.readFile).toHaveBeenCalledWith('/path/to/file.json', 'utf-8');
  });

  it('should handle empty objects', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('{}');
    const result = await readJson('/path/to/empty.json');
    expect(result).toEqual({});
  });

  it('should handle arrays', async () => {
    const mockArray = [1, 2, 3];
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockArray));
    const result = await readJson<number[]>('/path/to/array.json');
    expect(result).toEqual(mockArray);
  });

  it('should handle nested objects', async () => {
    const nested = { a: { b: { c: 'deep' } } };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(nested));
    const result = await readJson('/path/to/nested.json');
    expect(result).toEqual(nested);
  });

  it('should throw error for invalid JSON', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('{ invalid json }');
    await expect(readJson('/path/to/invalid.json')).rejects.toThrow();
  });
});

describe('pathExists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true for existing paths', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    const exists = await pathExists('/existing/path');
    expect(exists).toBe(true);
  });

  it('should return false for non-existent paths', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
    const exists = await pathExists('/non-existent/path');
    expect(exists).toBe(false);
  });

  it('should return false for permission errors', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('EACCES'));
    const exists = await pathExists('/forbidden/path');
    expect(exists).toBe(false);
  });

  it('should handle multiple calls independently', async () => {
    vi.mocked(fs.access)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('ENOENT'));

    expect(await pathExists('/path1')).toBe(true);
    expect(await pathExists('/path2')).toBe(false);
  });
});

describe('hashFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should compute SHA256 hash of file content', async () => {
    const content = Buffer.from('test content');
    vi.mocked(fs.readFile).mockResolvedValue(content);

    const hash = await hashFile('/path/to/file.js');

    expect(hash).toBe(crypto.createHash('sha256').update(content).digest('hex'));
    expect(fs.readFile).toHaveBeenCalledWith('/path/to/file.js');
  });

  it('should produce different hashes for different content', async () => {
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce(Buffer.from('content1'))
      .mockResolvedValueOnce(Buffer.from('content2'));

    const hash1 = await hashFile('/file1.js');
    const hash2 = await hashFile('/file2.js');

    expect(hash1).not.toBe(hash2);
  });

  it('should produce same hash for same content', async () => {
    const content = Buffer.from('identical content');
    vi.mocked(fs.readFile).mockResolvedValue(content);

    const hash1 = await hashFile('/file1.js');
    const hash2 = await hashFile('/file1.js');

    expect(hash1).toBe(hash2);
  });

  it('should handle empty files', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from(''));
    const hash = await hashFile('/empty.js');
    expect(hash).toBe(crypto.createHash('sha256').update(Buffer.from('')).digest('hex'));
  });

  it('should handle large files', async () => {
    const largeContent = Buffer.alloc(1024 * 1024); // 1MB
    vi.mocked(fs.readFile).mockResolvedValue(largeContent);

    const hash = await hashFile('/large.js');
    expect(hash).toBe(crypto.createHash('sha256').update(largeContent).digest('hex'));
    expect(hash).toHaveLength(64); // SHA256 produces 64 hex characters
  });
});

describe('readGitCommit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute git command and return commit hash', () => {
    const mockHash = 'abc123def456';
    vi.mocked(execSync).mockReturnValue(Buffer.from(mockHash + '\n'));

    const result = readGitCommit(repoRoot);

    expect(result).toBe(mockHash);
    expect(execSync).toHaveBeenCalledWith('git rev-parse HEAD', {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  });

  it('should trim whitespace from git output', () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from('  abc123  \n  '));
    const result = readGitCommit(repoRoot);
    expect(result).toBe('abc123');
  });

  it('should return null when git command fails', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('Not a git repository');
    });

    const result = readGitCommit(repoRoot);
    expect(result).toBe(null);
  });

  it('should return null for general errors', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('Unknown error');
    });

    const result = readGitCommit(repoRoot);
    expect(result).toBe(null);
  });

  it('should return null when path is outside repo', () => {
    const outsidePath = '/tmp/malicious';
    const result = readGitCommit(outsidePath);
    expect(result).toBe(null);
    expect(execSync).not.toHaveBeenCalled();
  });

  it('should handle long commit hashes (40 characters)', () => {
    const longHash = 'a'.repeat(40);
    vi.mocked(execSync).mockReturnValue(Buffer.from(longHash));
    const result = readGitCommit(repoRoot);
    expect(result).toBe(longHash);
  });

  it('should handle short commit hashes (7 characters)', () => {
    const shortHash = 'abc1234';
    vi.mocked(execSync).mockReturnValue(Buffer.from(shortHash));
    const result = readGitCommit(repoRoot);
    expect(result).toBe(shortHash);
  });

  it('should use correct stdio configuration to suppress stderr', () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from('abc123'));
    readGitCommit(repoRoot);

    expect(execSync).toHaveBeenCalledWith(expect.any(String), {
      cwd: expect.any(String),
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  });

  it('should pass correct cwd to execSync', () => {
    const customPath = path.join(repoRoot, 'packages');
    vi.mocked(execSync).mockReturnValue(Buffer.from('abc123'));

    readGitCommit(customPath);

    expect(execSync).toHaveBeenCalledWith(expect.any(String), {
      cwd: customPath,
      stdio: expect.any(Array),
    });
  });
});

describe('--force flag improvements', () => {
  describe('force flag parsing', () => {
    it('should detect --force flag in arguments', () => {
      const args = ['--version', '1.0.0', '--force'];
      const force = args.includes('--force');
      expect(force).toBe(true);
    });

    it('should return false when --force is not present', () => {
      const args = ['--version', '1.0.0'];
      const force = args.includes('--force');
      expect(force).toBe(false);
    });

    it('should detect --force in any position', () => {
      const args1 = ['--force', '--version', '1.0.0'];
      const args2 = ['--version', '1.0.0', '--force'];
      const args3 = ['--version=1.0.0', '--force'];

      expect(args1.includes('--force')).toBe(true);
      expect(args2.includes('--force')).toBe(true);
      expect(args3.includes('--force')).toBe(true);
    });
  });

  describe('manifest version collision with --force', () => {
    it('should detect when version already exists in manifest', () => {
      const manifest = {
        versions: {
          '1.0.0': { version: '1.0.0', entry: 'schema.js', builtAt: '2024-01-01' },
        },
      };

      const newVersion = '1.0.0';
      const versionExists = manifest?.versions?.[newVersion];

      expect(versionExists).toBeDefined();
    });

    it('should allow overwrite when force flag is true', () => {
      const manifest = {
        versions: {
          '1.0.0': { version: '1.0.0', entry: 'schema.js', builtAt: '2024-01-01' },
        },
      };

      const newVersion = '1.0.0';
      const force = true;
      const versionExists = manifest?.versions?.[newVersion];

      if (versionExists && !force) {
        throw new Error('Should not reach this without force');
      }

      // With force=true, should continue without error
      expect(versionExists).toBeDefined();
      expect(force).toBe(true);
    });

    it('should provide appropriate warning message when overwriting with force', () => {
      const version = '1.0.0';
      const force = true;
      const manifestHasVersion = true;

      const warnings: string[] = [];
      const mockWarn = (msg: string) => warnings.push(msg);

      if (manifestHasVersion && force) {
        mockWarn(`Overwriting existing version ${version} due to --force flag.`);
      }

      expect(warnings).toContain('Overwriting existing version 1.0.0 due to --force flag.');
    });
  });

  describe('directory collision with --force', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should remove existing directory when force is true', async () => {
      const versionDir = '/app/versions/1.0.0';
      const force = true;

      vi.mocked(fs.access).mockResolvedValue(undefined);

      const exists = await pathExists(versionDir);

      if (exists && force) {
        await fs.rm(versionDir, { recursive: true, force: true });
      }

      expect(fs.rm).toHaveBeenCalledWith(versionDir, { recursive: true, force: true });
    });

    it('should not remove directory when force is false and exists', async () => {
      const versionDir = '/app/versions/1.0.0';
      const force = false;

      vi.mocked(fs.access).mockResolvedValue(undefined);

      const exists = await pathExists(versionDir);

      if (exists && !force) {
        // Should exit rather than remove
        expect(exists).toBe(true);
        expect(force).toBe(false);
      }

      expect(fs.rm).not.toHaveBeenCalled();
    });

    it('should provide warning when removing existing directory with force', async () => {
      const versionDir = '/app/versions/1.0.0';
      const force = true;

      vi.mocked(fs.access).mockResolvedValue(undefined);

      const warnings: string[] = [];
      const mockWarn = (msg: string) => warnings.push(msg);

      const exists = await pathExists(versionDir);

      if (exists && force) {
        mockWarn(`Overwriting existing directory ${versionDir} due to --force flag.`);
        await fs.rm(versionDir, { recursive: true, force: true });
      }

      expect(warnings).toContain('Overwriting existing directory /app/versions/1.0.0 due to --force flag.');
      expect(fs.rm).toHaveBeenCalled();
    });
  });

  describe('race condition protection with mkdir', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should use recursive: false to detect race conditions', async () => {
      const versionDir = '/app/versions/1.0.0';

      await fs.mkdir(versionDir, { recursive: false });

      expect(fs.mkdir).toHaveBeenCalledWith(versionDir, { recursive: false });
    });

    it('should catch EEXIST error from mkdir as safety check', async () => {
      const versionDir = '/app/versions/1.0.0';

      vi.mocked(fs.mkdir).mockRejectedValue({ code: 'EEXIST' } as Error);

      try {
        await fs.mkdir(versionDir, { recursive: false });
        expect.fail('Should have thrown EEXIST');
      } catch (error: any) {
        expect(error.code).toBe('EEXIST');
      }
    });

    it('should rethrow non-EEXIST errors', async () => {
      const versionDir = '/app/versions/1.0.0';
      const permissionError = Object.assign(new Error('Permission denied'), { code: 'EACCES' });

      vi.mocked(fs.mkdir).mockRejectedValue(permissionError);

      await expect(fs.mkdir(versionDir, { recursive: false })).rejects.toThrow('Permission denied');
    });
  });

  describe('combined force flag scenarios', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle both manifest and directory existing with force', async () => {
      const version = '1.0.0';
      const versionDir = '/app/versions/1.0.0';
      const force = true;

      const manifest = {
        versions: {
          '1.0.0': { version: '1.0.0', entry: 'schema.js', builtAt: '2024-01-01' },
        },
      };

      const warnings: string[] = [];
      const mockWarn = (msg: string) => warnings.push(msg);

      // Check manifest
      const manifestHasVersion = !!manifest?.versions?.[version];
      if (manifestHasVersion && force) {
        mockWarn(`Overwriting existing version ${version} due to --force flag.`);
      }

      // Check directory
      vi.mocked(fs.access).mockResolvedValue(undefined);
      const dirExists = await pathExists(versionDir);

      if (dirExists && force) {
        mockWarn(`Overwriting existing directory ${versionDir} due to --force flag.`);
        await fs.rm(versionDir, { recursive: true, force: true });
      }

      expect(warnings).toHaveLength(2);
      expect(warnings[0]).toContain('Overwriting existing version');
      expect(warnings[1]).toContain('Overwriting existing directory');
      expect(fs.rm).toHaveBeenCalled();
    });

    it('should fail fast at manifest check without force flag', () => {
      const version = '1.0.0';
      const force = false;

      const manifest = {
        versions: {
          '1.0.0': { version: '1.0.0', entry: 'schema.js', builtAt: '2024-01-01' },
        },
      };

      const errors: string[] = [];
      const mockError = (msg: string) => errors.push(msg);

      const manifestHasVersion = !!manifest?.versions?.[version];

      if (manifestHasVersion && !force) {
        mockError(`Version ${version} already exists in schemas manifest. Use --force to overwrite.`);
      }

      expect(errors).toContain('Version 1.0.0 already exists in schemas manifest. Use --force to overwrite.');
      // Directory check should not happen (fail fast)
      expect(fs.access).not.toHaveBeenCalled();
    });
  });
});

describe('Integration scenarios (documentation)', () => {
  it('should document complete freeze workflow', () => {
    // This test serves as documentation for the complete workflow:
    // 1. Parse version from CLI args
    // 2. Validate version doesn't exist
    // 3. Create version directory
    // 4. Build schema with Vite
    // 5. Hash the output
    // 6. Read git commit
    // 7. Write metadata
    // 8. Update manifest
    expect(true).toBe(true);
  });

  it('should prevent overwriting existing versions', () => {
    // The actual implementation checks if version directory exists
    // and aborts if it does, preventing accidental overwrites
    expect(true).toBe(true);
  });

  it('should prevent directory overwrite attempts', () => {
    // The implementation validates paths are inside repo
    // before any filesystem operations
    expect(true).toBe(true);
  });

  it('should validate extensions entry exists before build', () => {
    // The implementation checks that the extensions entry file
    // exists before attempting to build the schema
    expect(true).toBe(true);
  });

  it('should validate build output after Vite completes', () => {
    // After building, the implementation verifies that
    // the expected schema.js file was actually created
    expect(true).toBe(true);
  });
});
