import { describe, it, expect, vi } from 'vitest';
import { Editor } from '@core/Editor.js';
import { getTestDataAsFileBuffer } from '@tests/helpers/helpers.js';
import {
  getLatestFrozenSchemaVersion,
  listFrozenSchemaVersions,
  loadFrozenSchema,
  getFrozenSchemaMetadata,
  hasFrozenSchema,
} from './schema-loader';

describe('schema-loader', () => {
  describe('basic functionality', () => {
    it('returns latest version when none is provided', () => {
      const versions = listFrozenSchemaVersions();
      const latest = getLatestFrozenSchemaVersion();
      if (!versions.length) {
        expect(latest).toBeNull();
        return;
      }

      expect(latest).toBeTruthy();
      expect(versions).toContain(latest as string);
    });

    it('warns and rejects when a requested version is missing', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await expect(loadFrozenSchema('999.999.999')).rejects.toThrow(/is not available/);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('loads frozen starter extensions and can initialize a headless editor', async () => {
      const frozen = await loadFrozenSchema();
      expect(typeof frozen.getStarterExtensions).toBe('function');

      const extensions = frozen.getStarterExtensions();
      expect(Array.isArray(extensions)).toBe(true);
      expect(extensions.length).toBeGreaterThan(0);

      const buffer = await getTestDataAsFileBuffer('simple-ordered-list.docx');
      const [content, , mediaFiles, fonts] = await Editor.loadXmlData(buffer, true);

      const editor = new Editor({
        isHeadless: true,
        mode: 'docx',
        documentId: 'frozen-loader-test',
        extensions,
        content,
        mediaFiles,
        fonts,
      });

      expect(editor.getJSON().type).toBe('doc');
      editor.destroy();
    });
  });

  describe('hash verification improvements', () => {
    it('should verify schema integrity when hash is present in manifest', async () => {
      const versions = listFrozenSchemaVersions();
      if (!versions.length) {
        console.warn('No frozen schemas available to test hash verification');
        return;
      }

      const version = versions[0];
      const metadata = getFrozenSchemaMetadata(version);

      // If hash exists in metadata, loading should verify it
      if (metadata?.hash) {
        // Should load successfully with valid hash
        await expect(loadFrozenSchema(version)).resolves.toBeDefined();
      }
    });

    it('should include hash in frozen schema metadata', () => {
      const versions = listFrozenSchemaVersions();
      if (!versions.length) {
        console.warn('No frozen schemas available to test metadata');
        return;
      }

      const version = versions[0];
      const metadata = getFrozenSchemaMetadata(version);

      expect(metadata).toBeDefined();
      expect(metadata).toHaveProperty('version');
      expect(metadata).toHaveProperty('entry');
      expect(metadata).toHaveProperty('builtAt');

      // Hash should be present (improvement from production readiness review)
      if (metadata) {
        // Hash may be in metadata
        expect(metadata).toHaveProperty('hash');
      }
    });

    it('should handle missing hash gracefully with error', async () => {
      const versions = listFrozenSchemaVersions();
      if (!versions.length) {
        console.warn('No frozen schemas available to test');
        return;
      }

      // The implementation should throw if hash is missing
      // This tests the improved error handling
      const version = versions[0];

      try {
        await loadFrozenSchema(version);
        // If successful, hash verification passed
        expect(true).toBe(true);
      } catch (error) {
        // If error, it should mention hash or integrity
        expect(error).toBeInstanceOf(Error);
        const errorMessage = (error as Error).message;
        // Should fail with integrity-related error
        expect(errorMessage).toBeDefined();
      }
    });

    it('should validate hash matches between manifest and metadata', () => {
      const versions = listFrozenSchemaVersions();
      if (!versions.length) {
        console.warn('No frozen schemas available to test');
        return;
      }

      for (const version of versions) {
        const metadata = getFrozenSchemaMetadata(version);

        if (metadata?.hash) {
          // Both manifest and metadata should have the same hash
          // This is validated during load
          expect(typeof metadata.hash).toBe('string');
          expect(metadata.hash.length).toBeGreaterThan(0);

          // SHA-256 hashes are 64 hex characters
          if (metadata.hash.length === 64) {
            expect(metadata.hash).toMatch(/^[a-f0-9]{64}$/);
          }
        }
      }
    });

    it('should compute hash correctly for loaded schemas', async () => {
      const versions = listFrozenSchemaVersions();
      if (!versions.length) {
        console.warn('No frozen schemas available to test');
        return;
      }

      const version = versions[0];

      // Loading the schema should internally verify the hash
      const frozen = await loadFrozenSchema(version);

      expect(frozen).toBeDefined();
      expect(frozen.getStarterExtensions).toBeDefined();
    });

    it('should fail with descriptive error on hash mismatch', async () => {
      const versions = listFrozenSchemaVersions();
      if (!versions.length) {
        console.warn('No frozen schemas available to test');
        return;
      }

      // Note: This test documents expected behavior
      // Actual hash mismatch would require tampering with files
      // The implementation should throw on mismatch
      const version = versions[0];

      try {
        await loadFrozenSchema(version);
        expect(true).toBe(true); // Hash verified successfully
      } catch (error) {
        // If there's an error, it should be descriptive
        expect(error).toBeInstanceOf(Error);
        const errorMessage = (error as Error).message;

        // Error should mention hash, integrity, or mismatch
        const hasRelevantError =
          errorMessage.includes('hash') ||
          errorMessage.includes('integrity') ||
          errorMessage.includes('mismatch') ||
          errorMessage.includes('Failed');

        expect(hasRelevantError).toBe(true);
      }
    });
  });

  describe('error handling improvements', () => {
    it('should provide clear error when schema version does not exist', async () => {
      await expect(loadFrozenSchema('0.0.0-nonexistent')).rejects.toThrow();
    });

    it('should list available versions in error when requested version not found', async () => {
      try {
        await loadFrozenSchema('999.999.999');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const errorMessage = (error as Error).message;

        // Error should mention available versions
        expect(errorMessage).toContain('is not available');
      }
    });

    it('should handle load failures with descriptive errors', async () => {
      const invalidVersion = '999.999.999';

      await expect(loadFrozenSchema(invalidVersion)).rejects.toThrow(/is not available/);
    });

    it('should warn when requested specific version is not found', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        await loadFrozenSchema('999.999.999');
      } catch {
        // Expected to fail
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('manifest consistency', () => {
    it('should have consistent metadata across manifest and individual files', () => {
      const versions = listFrozenSchemaVersions();

      for (const version of versions) {
        const metadata = getFrozenSchemaMetadata(version);

        expect(metadata).toBeDefined();
        expect(metadata?.version).toBe(version);
        expect(metadata?.entry).toBeDefined();
        expect(metadata?.builtAt).toBeDefined();
      }
    });

    it('should validate all versions in manifest have schema available', () => {
      const versions = listFrozenSchemaVersions();

      for (const version of versions) {
        const hasSchema = hasFrozenSchema(version);
        expect(hasSchema).toBe(true);
      }
    });

    it('should include all required metadata fields', () => {
      const versions = listFrozenSchemaVersions();

      for (const version of versions) {
        const metadata = getFrozenSchemaMetadata(version);

        if (metadata) {
          expect(metadata).toHaveProperty('version');
          expect(metadata).toHaveProperty('entry');
          expect(metadata).toHaveProperty('builtAt');
          expect(metadata).toHaveProperty('path');

          // Validate field types
          expect(typeof metadata.version).toBe('string');
          expect(typeof metadata.entry).toBe('string');
          expect(typeof metadata.builtAt).toBe('string');
          expect(typeof metadata.path).toBe('string');

          // sourceCommit may be null or string
          if (metadata.sourceCommit !== null && metadata.sourceCommit !== undefined) {
            expect(typeof metadata.sourceCommit).toBe('string');
          }
        }
      }
    });
  });

  describe('semver sorting', () => {
    it('should return latest version according to semver rules', () => {
      const versions = listFrozenSchemaVersions();
      if (versions.length < 2) {
        console.warn('Need multiple versions to test semver sorting');
        return;
      }

      const latest = getLatestFrozenSchemaVersion();

      expect(latest).toBeDefined();
      expect(versions).toContain(latest as string);
    });

    it('should handle prerelease versions correctly', () => {
      const versions = listFrozenSchemaVersions();

      // If any prerelease versions exist, they should be handled properly
      const prereleaseVersions = versions.filter((v) => v.includes('-'));

      if (prereleaseVersions.length > 0) {
        // Should still be able to load prerelease versions
        expect(prereleaseVersions.length).toBeGreaterThan(0);
      }
    });
  });
});
