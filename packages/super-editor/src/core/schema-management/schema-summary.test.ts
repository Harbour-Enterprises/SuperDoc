import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Schema } from 'prosemirror-model';
import { buildSchemaSummary, buildSchemaSummaryFromFrozen } from './schema-summary.js';
import * as schemaLoader from './schema-loader.js';
import { Schema as ExtensionSchema } from '../Schema.js';
import type { SchemaSummaryJSON } from '../types/EditorSchema.js';
import type { EditorExtension } from '../types/EditorConfig.js';

// Mock the schema loader module
vi.mock('./schema-loader.js', () => ({
  getLatestFrozenSchemaVersion: vi.fn(),
  hasFrozenSchema: vi.fn(),
  loadFrozenSchema: vi.fn(),
}));

// Mock ExtensionSchema
vi.mock('../Schema.js', () => ({
  Schema: {
    createSchemaByExtensions: vi.fn(),
  },
}));

describe('schema-summary', () => {
  describe('buildSchemaSummary', () => {
    let mockSchema: Schema;

    beforeEach(() => {
      // Create a basic mock schema
      const nodes = {
        doc: {
          content: 'block+',
          attrs: {
            version: { default: 1 },
          },
        },
        paragraph: {
          content: 'inline*',
          group: 'block',
          attrs: {
            id: { default: null },
            alignment: {}, // no default, so required
          },
          code: false,
        },
        text: {
          group: 'inline',
        },
        heading: {
          content: 'inline*',
          group: 'block',
          attrs: {
            level: { default: 1 },
          },
          defining: true,
          code: false,
        },
      };

      const marks = {
        bold: {
          inclusive: true,
          group: 'formatting',
          attrs: {
            color: { default: 'black' },
          },
        },
        italic: {
          inclusive: true,
          excludes: 'bold',
          spanning: false,
        },
        code: {
          inclusive: false,
          code: true,
          attrs: {
            language: {}, // required
          },
        },
      };

      mockSchema = new Schema({ nodes, marks });
    });

    it('should build a complete schema summary with all nodes and marks', () => {
      const summary = buildSchemaSummary(mockSchema, '1.0.0');

      expect(summary).toHaveProperty('version');
      expect(summary).toHaveProperty('schemaVersion', '1.0.0');
      expect(summary).toHaveProperty('topNode', 'doc');
      expect(summary).toHaveProperty('nodes');
      expect(summary).toHaveProperty('marks');
      expect(Array.isArray(summary.nodes)).toBe(true);
      expect(Array.isArray(summary.marks)).toBe(true);
    });

    it('should correctly map node attributes with default values', () => {
      const summary = buildSchemaSummary(mockSchema, '1.0.0');

      const docNode = summary.nodes.find((n) => n.name === 'doc');
      expect(docNode).toBeDefined();
      expect(docNode?.attrs).toHaveProperty('version');
      expect(docNode?.attrs.version).toEqual({
        default: 1,
        required: false,
      });
    });

    it('should correctly identify required attributes (no default)', () => {
      const summary = buildSchemaSummary(mockSchema, '1.0.0');

      const paragraphNode = summary.nodes.find((n) => n.name === 'paragraph');
      expect(paragraphNode?.attrs).toHaveProperty('alignment');
      expect(paragraphNode?.attrs.alignment).toEqual({
        default: null,
        required: true,
      });
    });

    it('should correctly identify optional attributes (with default)', () => {
      const summary = buildSchemaSummary(mockSchema, '1.0.0');

      const paragraphNode = summary.nodes.find((n) => n.name === 'paragraph');
      expect(paragraphNode?.attrs).toHaveProperty('id');
      expect(paragraphNode?.attrs.id).toEqual({
        default: null,
        required: false,
      });
    });

    it('should include relevant node spec fields', () => {
      const summary = buildSchemaSummary(mockSchema, '1.0.0');

      const paragraphNode = summary.nodes.find((n) => n.name === 'paragraph');
      expect(paragraphNode).toHaveProperty('group', 'block');
      expect(paragraphNode).toHaveProperty('code', false);

      const headingNode = summary.nodes.find((n) => n.name === 'heading');
      expect(headingNode).toHaveProperty('defining', true);
    });

    it('should exclude undefined spec fields', () => {
      const summary = buildSchemaSummary(mockSchema, '1.0.0');

      const textNode = summary.nodes.find((n) => n.name === 'text');
      expect(textNode).toBeDefined();
      expect(textNode).not.toHaveProperty('content');
      expect(textNode).not.toHaveProperty('defining');
    });

    it('should correctly map mark attributes', () => {
      const summary = buildSchemaSummary(mockSchema, '1.0.0');

      const boldMark = summary.marks.find((m) => m.name === 'bold');
      expect(boldMark?.attrs).toHaveProperty('color');
      expect(boldMark?.attrs.color).toEqual({
        default: 'black',
        required: false,
      });

      const codeMark = summary.marks.find((m) => m.name === 'code');
      expect(codeMark?.attrs).toHaveProperty('language');
      expect(codeMark?.attrs.language).toEqual({
        default: null,
        required: true,
      });
    });

    it('should include relevant mark spec fields', () => {
      const summary = buildSchemaSummary(mockSchema, '1.0.0');

      const boldMark = summary.marks.find((m) => m.name === 'bold');
      expect(boldMark).toHaveProperty('inclusive', true);
      expect(boldMark).toHaveProperty('group', 'formatting');

      const italicMark = summary.marks.find((m) => m.name === 'italic');
      expect(italicMark).toHaveProperty('excludes', 'bold');
      expect(italicMark).toHaveProperty('spanning', false);

      const codeMark = summary.marks.find((m) => m.name === 'code');
      expect(codeMark).toHaveProperty('code', true);
    });

    it('should handle nodes with no attributes', () => {
      const summary = buildSchemaSummary(mockSchema, '1.0.0');

      const textNode = summary.nodes.find((n) => n.name === 'text');
      expect(textNode?.attrs).toEqual({});
    });

    it('should handle marks with no attributes', () => {
      const summary = buildSchemaSummary(mockSchema, '1.0.0');

      const italicMark = summary.marks.find((m) => m.name === 'italic');
      expect(italicMark?.attrs).toEqual({});
    });

    describe('input validation', () => {
      it('should throw if schema is null', () => {
        expect(() => buildSchemaSummary(null as unknown as Schema, '1.0.0')).toThrow(
          'Invalid schema: schema must be a valid ProseMirror Schema object.',
        );
      });

      it('should throw if schema is undefined', () => {
        expect(() => buildSchemaSummary(undefined as unknown as Schema, '1.0.0')).toThrow(
          'Invalid schema: schema must be a valid ProseMirror Schema object.',
        );
      });

      it('should throw if schema is not an object', () => {
        expect(() => buildSchemaSummary('invalid' as unknown as Schema, '1.0.0')).toThrow(
          'Invalid schema: schema must be a valid ProseMirror Schema object.',
        );
      });

      it('should throw if schemaVersion is null', () => {
        expect(() => buildSchemaSummary(mockSchema, null as unknown as string)).toThrow(
          'Invalid schemaVersion: must be a non-empty string.',
        );
      });

      it('should throw if schemaVersion is undefined', () => {
        expect(() => buildSchemaSummary(mockSchema, undefined as unknown as string)).toThrow(
          'Invalid schemaVersion: must be a non-empty string.',
        );
      });

      it('should throw if schemaVersion is empty string', () => {
        expect(() => buildSchemaSummary(mockSchema, '')).toThrow(
          'Invalid schemaVersion: must be a non-empty string.',
        );
      });

      it('should throw if schemaVersion is not valid semver', () => {
        expect(() => buildSchemaSummary(mockSchema, 'invalid-version')).toThrow(
          'Invalid schemaVersion format',
        );
      });

      it('should throw if schemaVersion is missing patch version', () => {
        expect(() => buildSchemaSummary(mockSchema, '1.0')).toThrow('Invalid schemaVersion format');
      });

      it('should accept valid semver with prerelease', () => {
        expect(() => buildSchemaSummary(mockSchema, '1.0.0-beta.1')).not.toThrow();
      });

      it('should accept valid semver with build metadata', () => {
        expect(() => buildSchemaSummary(mockSchema, '1.0.0+build.123')).not.toThrow();
      });

      it('should accept valid semver with both prerelease and build', () => {
        expect(() => buildSchemaSummary(mockSchema, '1.0.0-alpha.1+build.123')).not.toThrow();
      });
    });
  });

  describe('buildSchemaSummaryFromFrozen', () => {
    let mockEditor: any;
    let mockSchema: Schema;
    let mockExtensions: EditorExtension[];

    beforeEach(() => {
      mockEditor = {
        schema: null,
      };

      const nodes = {
        doc: { content: 'block+' },
        paragraph: { content: 'inline*', group: 'block' },
        text: { group: 'inline' },
      };

      const marks = {
        bold: { inclusive: true },
      };

      mockSchema = new Schema({ nodes, marks });

      mockExtensions = [
        { type: 'extension', name: 'commands' },
        { type: 'node', name: 'doc' },
        { type: 'node', name: 'paragraph' },
      ] as EditorExtension[];

      // Setup default mocks
      vi.mocked(schemaLoader.getLatestFrozenSchemaVersion).mockReturnValue('1.0.0');
      vi.mocked(schemaLoader.hasFrozenSchema).mockReturnValue(true);
      vi.mocked(schemaLoader.loadFrozenSchema).mockResolvedValue({
        getStarterExtensions: () => mockExtensions,
      });
      vi.mocked(ExtensionSchema.createSchemaByExtensions).mockReturnValue(mockSchema);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should load and summarize the latest frozen schema when no version specified', async () => {
      const summary = await buildSchemaSummaryFromFrozen(mockEditor);

      expect(schemaLoader.getLatestFrozenSchemaVersion).toHaveBeenCalled();
      expect(schemaLoader.loadFrozenSchema).toHaveBeenCalledWith('1.0.0');
      expect(ExtensionSchema.createSchemaByExtensions).toHaveBeenCalledWith(mockExtensions, mockEditor);
      expect(summary).toHaveProperty('schemaVersion', '1.0.0');
      expect(summary.nodes.length).toBeGreaterThan(0);
    });

    it('should load and summarize a specific frozen schema version (string)', async () => {
      vi.mocked(schemaLoader.hasFrozenSchema).mockImplementation((v) => v === '2.0.0');

      const summary = await buildSchemaSummaryFromFrozen(mockEditor, '2.0.0');

      expect(schemaLoader.hasFrozenSchema).toHaveBeenCalledWith('2.0.0');
      expect(schemaLoader.loadFrozenSchema).toHaveBeenCalledWith('2.0.0');
      expect(summary).toHaveProperty('schemaVersion', '2.0.0');
    });

    it('should load and summarize a specific frozen schema version (options object)', async () => {
      vi.mocked(schemaLoader.hasFrozenSchema).mockImplementation((v) => v === '2.0.0');

      const summary = await buildSchemaSummaryFromFrozen(mockEditor, { version: '2.0.0' });

      expect(schemaLoader.hasFrozenSchema).toHaveBeenCalledWith('2.0.0');
      expect(schemaLoader.loadFrozenSchema).toHaveBeenCalledWith('2.0.0');
      expect(summary).toHaveProperty('schemaVersion', '2.0.0');
    });

    it('should throw if no frozen schemas are available', async () => {
      vi.mocked(schemaLoader.getLatestFrozenSchemaVersion).mockReturnValue(null);

      await expect(buildSchemaSummaryFromFrozen(mockEditor)).rejects.toThrow(
        'No frozen schemas are available to summarize.',
      );
    });

    it('should throw if requested version is not available', async () => {
      vi.mocked(schemaLoader.hasFrozenSchema).mockReturnValue(false);
      vi.mocked(schemaLoader.getLatestFrozenSchemaVersion).mockReturnValue('1.0.0');

      await expect(buildSchemaSummaryFromFrozen(mockEditor, '99.99.99')).rejects.toThrow(
        'Schema version "99.99.99" is not available. Latest available version: 1.0.0',
      );
    });

    it('should provide helpful error when no versions exist and requested version not found', async () => {
      vi.mocked(schemaLoader.hasFrozenSchema).mockReturnValue(false);
      vi.mocked(schemaLoader.getLatestFrozenSchemaVersion).mockReturnValue(null);

      await expect(buildSchemaSummaryFromFrozen(mockEditor, '1.0.0')).rejects.toThrow(
        'Schema version "1.0.0" is not available. No versions present.',
      );
    });

    it('should throw if frozen module does not expose getStarterExtensions', async () => {
      vi.mocked(schemaLoader.loadFrozenSchema).mockResolvedValue({
        // missing getStarterExtensions
      });

      await expect(buildSchemaSummaryFromFrozen(mockEditor)).rejects.toThrow(
        'Frozen schema version "1.0.0" does not expose getStarterExtensions().',
      );
    });

    it('should throw if getStarterExtensions is not a function', async () => {
      vi.mocked(schemaLoader.loadFrozenSchema).mockResolvedValue({
        getStarterExtensions: 'not-a-function' as any,
      });

      await expect(buildSchemaSummaryFromFrozen(mockEditor)).rejects.toThrow(
        'Frozen schema version "1.0.0" does not expose getStarterExtensions().',
      );
    });

    it('should throw if extensions array is empty', async () => {
      vi.mocked(schemaLoader.loadFrozenSchema).mockResolvedValue({
        getStarterExtensions: () => [],
      });

      await expect(buildSchemaSummaryFromFrozen(mockEditor)).rejects.toThrow(
        'Invalid extensions from frozen schema "1.0.0": expected non-empty array, got empty array.',
      );
    });

    it('should throw if extensions is not an array', async () => {
      vi.mocked(schemaLoader.loadFrozenSchema).mockResolvedValue({
        getStarterExtensions: () => null as any,
      });

      await expect(buildSchemaSummaryFromFrozen(mockEditor)).rejects.toThrow(
        'Invalid extensions from frozen schema "1.0.0": expected non-empty array, got object.',
      );
    });

    it('should create schema using ExtensionSchema.createSchemaByExtensions', async () => {
      await buildSchemaSummaryFromFrozen(mockEditor);

      expect(ExtensionSchema.createSchemaByExtensions).toHaveBeenCalledWith(mockExtensions, mockEditor);
    });

    it('should pass editor instance to createSchemaByExtensions', async () => {
      const customEditor = { customProp: 'test' };

      await buildSchemaSummaryFromFrozen(customEditor as any);

      expect(ExtensionSchema.createSchemaByExtensions).toHaveBeenCalledWith(
        mockExtensions,
        customEditor,
      );
    });

    it('should return a complete schema summary with correct structure', async () => {
      const summary = await buildSchemaSummaryFromFrozen(mockEditor);

      expect(summary).toHaveProperty('version');
      expect(summary).toHaveProperty('schemaVersion');
      expect(summary).toHaveProperty('topNode');
      expect(summary).toHaveProperty('nodes');
      expect(summary).toHaveProperty('marks');
      expect(Array.isArray(summary.nodes)).toBe(true);
      expect(Array.isArray(summary.marks)).toBe(true);
    });

    it('should include all nodes from the frozen schema', async () => {
      const summary = await buildSchemaSummaryFromFrozen(mockEditor);

      expect(summary.nodes.length).toBeGreaterThan(0);
      const nodeNames = summary.nodes.map((n) => n.name);
      expect(nodeNames).toContain('doc');
      expect(nodeNames).toContain('paragraph');
      expect(nodeNames).toContain('text');
    });

    it('should include all marks from the frozen schema', async () => {
      const summary = await buildSchemaSummaryFromFrozen(mockEditor);

      expect(summary.marks.length).toBeGreaterThan(0);
      const markNames = summary.marks.map((m) => m.name);
      expect(markNames).toContain('bold');
    });
  });
});
