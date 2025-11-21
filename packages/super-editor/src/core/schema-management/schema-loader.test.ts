import { describe, it, expect, vi } from 'vitest';
import { Editor } from '@core/Editor.js';
import { getTestDataAsFileBuffer } from '@tests/helpers/helpers.js';
import {
  getLatestFrozenSchemaVersion,
  listFrozenSchemaVersions,
  loadFrozenSchema,
} from './schema-loader';

describe('schema-loader', () => {
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
