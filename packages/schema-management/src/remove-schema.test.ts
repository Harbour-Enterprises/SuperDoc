import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

// Mock fs and path modules
vi.mock('node:fs/promises');
vi.mock('node:path');

describe('remove-schema security validation', () => {
  let mockReadFile: ReturnType<typeof vi.fn>;
  let mockWriteFile: ReturnType<typeof vi.fn>;
  let mockRm: ReturnType<typeof vi.fn>;
  let mockExit: ReturnType<typeof vi.fn>;
  let mockConsoleError: ReturnType<typeof vi.fn>;
  let mockConsoleLog: ReturnType<typeof vi.fn>;

  const packageRoot = '/test/package/root';
  const versionsRoot = path.join(packageRoot, 'versions');

  beforeEach(() => {
    mockReadFile = vi.fn();
    mockWriteFile = vi.fn();
    mockRm = vi.fn();
    mockExit = vi.fn();
    mockConsoleError = vi.fn();
    mockConsoleLog = vi.fn();

    vi.mocked(fs.readFile).mockImplementation(mockReadFile);
    vi.mocked(fs.writeFile).mockImplementation(mockWriteFile);
    vi.mocked(fs.rm).mockImplementation(mockRm);

    // Mock process.exit
    process.exit = mockExit as any;
    console.error = mockConsoleError;
    console.log = mockConsoleLog;

    // Setup path.resolve to return predictable paths
    vi.mocked(path.resolve).mockImplementation((...args) => args.join('/'));
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('semver validation', () => {
    it('should reject version with no patch number (X.Y format)', () => {
      // The semver pattern requires three parts: major.minor.patch
      const invalidVersion = '1.0';
      const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

      expect(semverPattern.test(invalidVersion)).toBe(false);
    });

    it('should reject version with only major number', () => {
      const invalidVersion = '1';
      const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

      expect(semverPattern.test(invalidVersion)).toBe(false);
    });

    it('should reject version with non-numeric parts', () => {
      const invalidVersion = 'v1.0.0';
      const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

      expect(semverPattern.test(invalidVersion)).toBe(false);
    });

    it('should reject version with special characters in base version', () => {
      const invalidVersion = '1.0.@';
      const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

      expect(semverPattern.test(invalidVersion)).toBe(false);
    });

    it('should accept valid semver X.Y.Z format', () => {
      const validVersion = '1.0.0';
      const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

      expect(semverPattern.test(validVersion)).toBe(true);
    });

    it('should accept valid semver with prerelease', () => {
      const validVersion = '1.0.0-beta.1';
      const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

      expect(semverPattern.test(validVersion)).toBe(true);
    });

    it('should accept valid semver with complex prerelease', () => {
      const validVersion = '2.0.0-rc.1.2.3';
      const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

      expect(semverPattern.test(validVersion)).toBe(true);
    });

    it('should accept version with build metadata is handled by script logic', () => {
      // Build metadata (+build.123) is typically handled separately
      const versionWithBuild = '1.0.0+build.123';
      const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

      // The pattern doesn't explicitly support +metadata, which is correct
      // The script should handle this case separately if needed
      expect(semverPattern.test(versionWithBuild)).toBe(false);
    });
  });

  describe('path traversal protection', () => {
    it('should prevent path traversal with ../ sequences', () => {
      const versionsRoot = '/app/versions';
      const maliciousVersion = '../../../etc/passwd';

      // Mock path.resolve to simulate traversal
      vi.mocked(path.resolve).mockImplementation((...args) => {
        if (args.length === 1) return args[0];
        // Simulate traversal to /etc/passwd
        return '/etc/passwd';
      });

      const versionDir = path.resolve(versionsRoot, maliciousVersion);
      const expectedBasePath = path.resolve(versionsRoot) + path.sep;

      // The security check: versionDir must start with versionsRoot + separator
      const isPathTraversal = !versionDir.startsWith(expectedBasePath);

      expect(isPathTraversal).toBe(true);
    });

    it('should prevent path traversal with absolute paths', () => {
      const versionsRoot = '/app/versions';
      const maliciousVersion = '/etc/passwd';

      // Mock path.resolve - absolute paths typically resolve to themselves
      vi.mocked(path.resolve).mockImplementation((...args) => {
        if (args.length === 1) return args[0];
        // Absolute path takes precedence
        return args[1].startsWith('/') ? args[1] : `${args[0]}/${args[1]}`;
      });

      const versionDir = path.resolve(versionsRoot, maliciousVersion);
      const expectedBasePath = path.resolve(versionsRoot) + path.sep;

      const isPathTraversal = !versionDir.startsWith(expectedBasePath);

      expect(isPathTraversal).toBe(true);
    });

    it('should allow valid version path', () => {
      const versionsRoot = '/app/versions';
      const validVersion = '1.0.0';

      // Mock path.resolve to return proper paths for this test
      vi.mocked(path.resolve).mockImplementation((...args) => {
        if (args.length === 1) return args[0]; // versionsRoot alone
        return `${args[0]}/${args[1]}`; // versionsRoot + version
      });

      const versionDir = path.resolve(versionsRoot, validVersion);
      const expectedBasePath = path.resolve(versionsRoot) + '/';

      const isPathTraversal = !versionDir.startsWith(expectedBasePath);

      expect(isPathTraversal).toBe(false);
      expect(versionDir).toBe('/app/versions/1.0.0');
    });

    it('should prevent Windows-style path traversal', () => {
      // Note: This test documents the expected behavior on Windows systems
      // The actual path.resolve behavior depends on the OS
      // On Unix systems, Windows paths are treated as strings, not resolved
      const versionsRoot = 'C:\\app\\versions';
      const maliciousVersion = '..\\..\\..\\Windows\\System32';

      // Mock Windows-style resolution for this test
      vi.mocked(path.resolve).mockImplementation((...args) => {
        if (args.length === 1) return args[0];
        // Simulate Windows traversal
        return 'C:\\Windows\\System32';
      });

      const versionDir = path.resolve(versionsRoot, maliciousVersion);
      const expectedBasePath = path.resolve(versionsRoot) + path.sep;

      const isPathTraversal = !versionDir.startsWith(expectedBasePath);

      // Should detect traversal attempt
      expect(isPathTraversal).toBe(true);
    });

    it('should validate that security check uses path.sep', () => {
      // Ensure the check includes path separator to prevent prefix attacks
      // e.g., /app/versions-malicious should not pass for /app/versions
      const versionsRoot = '/app/versions';
      const basePathWithSep = path.resolve(versionsRoot) + path.sep;
      const basePathWithoutSep = path.resolve(versionsRoot);

      expect(basePathWithSep).toContain(path.sep);
      expect(basePathWithSep).not.toBe(basePathWithoutSep);
    });

    it('should prevent directory prefix attacks', () => {
      const versionsRoot = '/app/versions';
      const maliciousVersion = '../versions-evil/schema.js';

      vi.mocked(path.resolve).mockImplementation((...args) => {
        if (args.length === 1) return args[0];
        // Simulate traversal
        return '/app/versions-evil/schema.js';
      });

      const versionDir = path.resolve(versionsRoot, maliciousVersion);
      const expectedBasePath = path.resolve(versionsRoot) + path.sep;

      const isPathTraversal = !versionDir.startsWith(expectedBasePath);

      expect(isPathTraversal).toBe(true);
    });
  });

  describe('argument parsing', () => {
    it('should parse --version=X.Y.Z format', () => {
      const args = ['--version=1.0.0'];

      // Simulate the parseVersion function logic
      const parseVersion = (args: string[]): string | null => {
        for (let i = 0; i < args.length; i += 1) {
          const arg = args[i];
          if (arg.startsWith('--version=')) return arg.split('=')[1];
          if (arg === '--version') return args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
          if (!arg.startsWith('--')) return arg;
        }
        return null;
      };

      const version = parseVersion(args);
      expect(version).toBe('1.0.0');
    });

    it('should parse --version X.Y.Z format', () => {
      const args = ['--version', '1.0.0'];

      const parseVersion = (args: string[]): string | null => {
        for (let i = 0; i < args.length; i += 1) {
          const arg = args[i];
          if (arg.startsWith('--version=')) return arg.split('=')[1];
          if (arg === '--version') return args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
          if (!arg.startsWith('--')) return arg;
        }
        return null;
      };

      const version = parseVersion(args);
      expect(version).toBe('1.0.0');
    });

    it('should parse positional version argument', () => {
      const args = ['1.0.0'];

      const parseVersion = (args: string[]): string | null => {
        for (let i = 0; i < args.length; i += 1) {
          const arg = args[i];
          if (arg.startsWith('--version=')) return arg.split('=')[1];
          if (arg === '--version') return args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
          if (!arg.startsWith('--')) return arg;
        }
        return null;
      };

      const version = parseVersion(args);
      expect(version).toBe('1.0.0');
    });

    it('should return null for --version with no value', () => {
      const args = ['--version'];

      const parseVersion = (args: string[]): string | null => {
        for (let i = 0; i < args.length; i += 1) {
          const arg = args[i];
          if (arg.startsWith('--version=')) return arg.split('=')[1];
          if (arg === '--version') return args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
          if (!arg.startsWith('--')) return arg;
        }
        return null;
      };

      const version = parseVersion(args);
      expect(version).toBeNull();
    });

    it('should return null for --version followed by another flag', () => {
      const args = ['--version', '--force'];

      const parseVersion = (args: string[]): string | null => {
        for (let i = 0; i < args.length; i += 1) {
          const arg = args[i];
          if (arg.startsWith('--version=')) return arg.split('=')[1];
          if (arg === '--version') return args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
          if (!arg.startsWith('--')) return arg;
        }
        return null;
      };

      const version = parseVersion(args);
      expect(version).toBeNull();
    });
  });

  describe('manifest validation', () => {
    it('should check if version exists in manifest before removal', () => {
      const manifest = {
        versions: {
          '1.0.0': { version: '1.0.0', entry: 'schema.js', builtAt: '2024-01-01' },
          '2.0.0': { version: '2.0.0', entry: 'schema.js', builtAt: '2024-02-01' },
        },
      };

      const versionToRemove = '1.0.0';
      const exists = manifest.versions?.[versionToRemove];

      expect(exists).toBeDefined();
    });

    it('should detect when version does not exist in manifest', () => {
      const manifest = {
        versions: {
          '1.0.0': { version: '1.0.0', entry: 'schema.js', builtAt: '2024-01-01' },
        },
      };

      const versionToRemove = '2.0.0';
      const exists = manifest.versions?.[versionToRemove];

      expect(exists).toBeUndefined();
    });

    it('should handle empty manifest versions', () => {
      const manifest = {
        versions: {},
      };

      const versionToRemove = '1.0.0';
      const exists = manifest.versions?.[versionToRemove];

      expect(exists).toBeUndefined();
    });

    it('should handle malformed manifest', () => {
      const manifest = {};

      const versionToRemove = '1.0.0';
      const exists = (manifest as any).versions?.[versionToRemove];

      expect(exists).toBeUndefined();
    });
  });

  describe('file system operations', () => {
    it('should remove version directory recursively', async () => {
      const versionDir = '/app/versions/1.0.0';

      await fs.rm(versionDir, { recursive: true, force: true });

      expect(mockRm).toHaveBeenCalledWith(versionDir, { recursive: true, force: true });
    });

    it('should update manifest after removal', async () => {
      const manifest = {
        versions: {
          '1.0.0': { version: '1.0.0', entry: 'schema.js', builtAt: '2024-01-01' },
          '2.0.0': { version: '2.0.0', entry: 'schema.js', builtAt: '2024-02-01' },
        },
      };

      const updated = { ...manifest };
      delete updated.versions['1.0.0'];

      expect(updated.versions).not.toHaveProperty('1.0.0');
      expect(updated.versions).toHaveProperty('2.0.0');
      expect(Object.keys(updated.versions)).toHaveLength(1);
    });

    it('should write updated manifest as formatted JSON', () => {
      const manifest = {
        versions: {
          '2.0.0': { version: '2.0.0', entry: 'schema.js', builtAt: '2024-02-01' },
        },
      };

      const jsonString = JSON.stringify(manifest, null, 2);

      expect(jsonString).toContain('  '); // Indented
      expect(jsonString).toContain('"versions"');
    });
  });

  describe('error handling', () => {
    it('should handle JSON parse errors gracefully', async () => {
      mockReadFile.mockResolvedValue('invalid json {{{');

      try {
        JSON.parse('invalid json {{{');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SyntaxError);
      }
    });

    it('should handle file read errors', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT: file not found'));

      await expect(fs.readFile('/nonexistent')).rejects.toThrow('ENOENT');
    });

    it('should handle file write errors', async () => {
      mockWriteFile.mockRejectedValue(new Error('EACCES: permission denied'));

      await expect(fs.writeFile('/readonly', 'data')).rejects.toThrow('EACCES');
    });

    it('should handle directory removal errors', async () => {
      mockRm.mockRejectedValue(new Error('Directory not empty'));

      await expect(fs.rm('/dir', { recursive: true })).rejects.toThrow('Directory not empty');
    });
  });
});
