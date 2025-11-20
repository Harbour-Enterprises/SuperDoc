import { Editor } from '@harbour-enterprises/super-editor';
import type { FlowBlock } from '@superdoc/contracts';
import { toFlowBlocks } from '../../pm-adapter/src/index.js';

type EditorInstance = InstanceType<typeof Editor>;

export type HeaderFooterKind = 'header' | 'footer';
export type HeaderFooterType = 'default' | 'first' | 'even' | 'odd';

const SECTION_TYPES: HeaderFooterType[] = ['default', 'first', 'even', 'odd'];

type SectionKey = `${HeaderFooterKind}-${HeaderFooterType}` | `${HeaderFooterKind}-rId:${string}`;

type SectionEntry = {
  key: SectionKey;
  kind: HeaderFooterKind;
  type: HeaderFooterType;
  rId?: string; // The actual rId for this section
  editor: EditorInstance;
};

const waitForCreate = (editor: EditorInstance) =>
  new Promise<void>((resolve) => {
    editor.once('create', () => resolve());
  });

export class HeaderFooterRegistry {
  private readonly sections = new Map<SectionKey, SectionEntry>();
  private readonly mediaFiles?: Record<string, string>;

  private constructor(
    private readonly extensions: unknown[],
    mediaFiles?: Record<string, string>,
  ) {
    this.mediaFiles = mediaFiles;
  }

  static async create(
    parentEditor: EditorInstance,
    extensions: unknown[],
    sectionMetadata?: Array<{ headerRefs?: Record<string, string>; footerRefs?: Record<string, string> }>,
  ): Promise<HeaderFooterRegistry> {
    const mediaFiles = parentEditor.storage?.image?.media;
    const registry = new HeaderFooterRegistry(extensions, mediaFiles);
    await registry.bootstrap(parentEditor, sectionMetadata);
    return registry;
  }

  private async bootstrap(
    parentEditor: EditorInstance,
    sectionMetadata?: Array<{ headerRefs?: Record<string, string>; footerRefs?: Record<string, string> }>,
  ): Promise<void> {
    const converter: any = (parentEditor as any).converter;
    if (!converter) return;

    const tasks: Array<Promise<void>> = [];
    const loadedRIds = new Set<string>();

    // Load standard types (default, first, even, odd)
    SECTION_TYPES.forEach((type) => {
      const rId = converter.headerIds?.[type];
      const doc = converter.headers?.[rId];
      if (!rId || !doc) return;
      tasks.push(this.createSection(parentEditor, 'header', type, doc, rId));
      loadedRIds.add(rId);
    });

    SECTION_TYPES.forEach((type) => {
      const rId = converter.footerIds?.[type];
      const doc = converter.footers?.[rId];
      if (!rId || !doc) return;
      tasks.push(this.createSection(parentEditor, 'footer', type, doc, rId));
      loadedRIds.add(rId);
    });

    // Load additional per-section headers/footers that aren't mapped to standard types
    if (sectionMetadata) {
      for (const section of sectionMetadata) {
        // Load header rIds
        if (section.headerRefs) {
          for (const rId of Object.values(section.headerRefs)) {
            if (rId && !loadedRIds.has(rId)) {
              const doc = converter.headers?.[rId];
              if (doc) {
                tasks.push(this.createSectionByRId(parentEditor, 'header', rId, doc));
                loadedRIds.add(rId);
              }
            }
          }
        }
        // Load footer rIds
        if (section.footerRefs) {
          for (const rId of Object.values(section.footerRefs)) {
            if (rId && !loadedRIds.has(rId)) {
              const doc = converter.footers?.[rId];
              if (doc) {
                tasks.push(this.createSectionByRId(parentEditor, 'footer', rId, doc));
                loadedRIds.add(rId);
              }
            }
          }
        }
      }
    }

    await Promise.all(tasks);
  }

  private async createSection(
    parentEditor: EditorInstance,
    kind: HeaderFooterKind,
    type: HeaderFooterType,
    docJson: unknown,
    rId?: string,
  ): Promise<void> {
    const sectionEditor = new Editor({
      isHeadless: true,
      mode: 'docx',
      loadFromSchema: true,
      extensions: this.extensions,
      content: docJson,
      mediaFiles: parentEditor.storage?.image?.media,
      fonts: parentEditor.options.fonts,
      parentEditor,
      editable: false,
      documentId: `${parentEditor.options.documentId ?? 'doc'}-${kind}-${type}-${Date.now()}`,
    });

    await waitForCreate(sectionEditor);
    sectionEditor.setEditable(false, false);

    const key: SectionKey = `${kind}-${type}`;
    this.sections.set(key, {
      key,
      kind,
      type,
      rId,
      editor: sectionEditor,
    });
  }

  private async createSectionByRId(
    parentEditor: EditorInstance,
    kind: HeaderFooterKind,
    rId: string,
    docJson: unknown,
  ): Promise<void> {
    const sectionEditor = new Editor({
      isHeadless: true,
      mode: 'docx',
      loadFromSchema: true,
      extensions: this.extensions,
      content: docJson,
      mediaFiles: parentEditor.storage?.image?.media,
      fonts: parentEditor.options.fonts,
      parentEditor,
      editable: false,
      documentId: `${parentEditor.options.documentId ?? 'doc'}-${kind}-${rId}-${Date.now()}`,
    });

    await waitForCreate(sectionEditor);
    sectionEditor.setEditable(false, false);

    const key: SectionKey = `${kind}-rId:${rId}`;
    this.sections.set(key, {
      key,
      kind,
      type: 'default', // Use default as a fallback type for rId-based sections
      rId,
      editor: sectionEditor,
    });
  }

  hasSections(kind?: HeaderFooterKind): boolean {
    if (!kind) {
      return this.sections.size > 0;
    }
    return SECTION_TYPES.some((type) => this.sections.has(`${kind}-${type}`));
  }

  getFlowBlocks(kind: HeaderFooterKind, prefixBase: string): Record<string, FlowBlock[]> {
    const batch: Record<string, FlowBlock[]> = {};

    // Get standard type-based sections
    SECTION_TYPES.forEach((type) => {
      const section = this.sections.get(`${kind}-${type}`);
      if (!section) return;
      const docJson = section.editor.getJSON();
      const blocks = toFlowBlocks(docJson as any, {
        blockIdPrefix: `${prefixBase}-${kind}-${type}-`,
        mediaFiles: this.mediaFiles,
        enableRichHyperlinks: true,
      });
      if (blocks.length > 0) {
        batch[type] = blocks;
      }
    });

    // Get rId-based sections
    for (const [key, section] of this.sections.entries()) {
      if (section.kind === kind && section.rId && key.startsWith(`${kind}-rId:`)) {
        const docJson = section.editor.getJSON();
        const blocks = toFlowBlocks(docJson as any, {
          blockIdPrefix: `${prefixBase}-${kind}-${section.rId}-`,
          mediaFiles: this.mediaFiles,
          enableRichHyperlinks: true,
        });
        if (blocks.length > 0) {
          batch[section.rId] = blocks;
        }
      }
    }

    return batch;
  }

  destroy(): void {
    this.sections.forEach((section) => {
      section.editor.destroy?.();
    });
    this.sections.clear();
  }
}
