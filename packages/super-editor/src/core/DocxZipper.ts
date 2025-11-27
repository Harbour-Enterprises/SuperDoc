import xmljs from 'xml-js';
import JSZip from 'jszip';
import type { JSZipObject } from 'jszip';
import { getContentTypesFromXml } from './super-converter/helpers.js';
import { ensureXmlString, isXmlLike } from './encoding-helpers.js';

/**
 * Docx file entry
 */
export interface DocxFile {
  name: string;
  content: string;
}

/**
 * DocxZipper constructor parameters
 */
interface DocxZipperParams {
  debug?: boolean;
}

/**
 * Media files map
 */
type MediaFiles = Record<string, string>;

/**
 * Media map (URLs)
 */
type Media = Record<string, string>;

/**
 * Fonts map
 */
type Fonts = Record<string, Uint8Array>;

/**
 * Updated docs map
 */
type UpdatedDocs = Record<string, string>;

/**
 * Update zip parameters
 */
interface UpdateZipParams {
  docx: DocxFile[] | Record<string, string>;
  updatedDocs: UpdatedDocs;
  originalDocxFile?: File | Blob | Buffer;
  media: MediaFiles;
  fonts: Fonts;
  isHeadless: boolean;
}

/**
 * Class to handle unzipping and zipping of docx files
 */
class DocxZipper {
  debug: boolean;
  zip: JSZip;
  files: DocxFile[];
  media: Media;
  mediaFiles: MediaFiles;
  fonts: Fonts;

  constructor(params: DocxZipperParams = {}) {
    this.debug = params.debug || false;
    this.zip = new JSZip();
    this.files = [];
    this.media = {};
    this.mediaFiles = {};
    this.fonts = {};
  }

  /**
   * Get all docx data from the zipped docx
   *
   * [ContentTypes].xml
   * _rels/.rels
   * word/document.xml
   * word/_rels/document.xml.rels
   * word/footnotes.xml
   * word/endnotes.xml
   * word/header1.xml
   * word/theme/theme1.xml
   * word/settings.xml
   * word/styles.xml
   * word/webSettings.xml
   * word/fontTable.xml
   * docProps/core.xml
   * docProps/app.xml
   * */
  async getDocxData(file: File | Blob | Buffer | ArrayBuffer, isNode: boolean = false): Promise<DocxFile[]> {
    const extractedFiles = await this.unzip(file);
    const files = Object.entries(extractedFiles.files);

    for (const [, zipEntry] of files) {
      const name = zipEntry.name;

      if (isXmlLike(name)) {
        // Read raw bytes and decode (handles UTF-8 & UTF-16)
        const u8 = await zipEntry.async('uint8array');
        const content = ensureXmlString(u8);
        this.files.push({ name, content });
      } else if (
        (name.startsWith('word/media') && name !== 'word/media/') ||
        (zipEntry.name.startsWith('media') && zipEntry.name !== 'media/') ||
        (name.startsWith('media') && name !== 'media/')
      ) {
        // Media files
        if (isNode) {
          const buffer = await zipEntry.async('nodebuffer');
          const fileBase64 = buffer.toString('base64');
          this.mediaFiles[name] = fileBase64;
        } else {
          const blob = await zipEntry.async('blob');
          const extension = this.getFileExtension(name);
          const fileBase64 = await zipEntry.async('base64');
          this.mediaFiles[name] = `data:image/${extension};base64,${fileBase64}`;

          const fileObj = new File([blob], name, { type: blob.type });
          const imageUrl = URL.createObjectURL(fileObj);
          this.media[name] = imageUrl;
        }
      } else if (name.startsWith('word/fonts') && name !== 'word/fonts/') {
        // Font files
        const uint8array = await zipEntry.async('uint8array');
        this.fonts[name] = uint8array;
      }
    }

    return this.files;
  }

  getFileExtension(fileName: string): string | null {
    const fileSplit = fileName.split('.');
    if (fileSplit.length < 2) return null;
    return fileSplit[fileSplit.length - 1];
  }

  /**
   * Update [Content_Types].xml with extensions of new Image annotations
   */
  async updateContentTypes(
    docx: JSZip | { files: DocxFile[] | Record<string, string> },
    media: MediaFiles,
    fromJson: boolean,
    updatedDocs: UpdatedDocs = {},
  ): Promise<string | void> {
    const additionalPartNames = Object.keys(updatedDocs || {});
    const newMediaTypes = Object.keys(media)
      .map((name) => {
        return this.getFileExtension(name);
      })
      .filter(Boolean) as string[];

    const contentTypesPath = '[Content_Types].xml';
    let contentTypesXml: string;
    if (fromJson) {
      if ('files' in docx && Array.isArray(docx.files)) {
        contentTypesXml = docx.files.find((file) => file.name === contentTypesPath)?.content || '';
      } else if ('files' in docx) {
        contentTypesXml = docx.files?.[contentTypesPath] || '';
      } else {
        contentTypesXml = '';
      }
    } else {
      contentTypesXml = await (docx as JSZip).file(contentTypesPath)!.async('string');
    }

    let typesString = '';

    const defaultMediaTypes = getContentTypesFromXml(contentTypesXml);

    // Update media types in content types
    const seenTypes = new Set<string>();
    for (const type of newMediaTypes) {
      // Current extension already presented in Content_Types
      if (defaultMediaTypes.includes(type)) continue;
      if (seenTypes.has(type)) continue;

      const newContentType = `<Default Extension="${type}" ContentType="image/${type}"/>`;
      typesString += newContentType;
      seenTypes.add(type);
    }

    // Update for comments
    const xmlJson = JSON.parse(xmljs.xml2json(contentTypesXml, { compact: false }));
    const types = xmlJson.elements?.find((el: { name: string }) => el.name === 'Types') || {};

    // Overrides
    const hasComments = types.elements?.some(
      (el: { name: string; attributes: { PartName: string } }) =>
        el.name === 'Override' && el.attributes.PartName === '/word/comments.xml',
    );
    const hasCommentsExtended = types.elements?.some(
      (el: { name: string; attributes: { PartName: string } }) =>
        el.name === 'Override' && el.attributes.PartName === '/word/commentsExtended.xml',
    );
    const hasCommentsIds = types.elements?.some(
      (el: { name: string; attributes: { PartName: string } }) =>
        el.name === 'Override' && el.attributes.PartName === '/word/commentsIds.xml',
    );
    const hasCommentsExtensible = types.elements?.some(
      (el: { name: string; attributes: { PartName: string } }) =>
        el.name === 'Override' && el.attributes.PartName === '/word/commentsExtensible.xml',
    );

    const hasFile = (filename: string): boolean => {
      if (!docx || !('files' in docx)) return false;
      if (!fromJson) return Boolean((docx as JSZip).files[filename]);
      if (Array.isArray(docx.files)) return docx.files.some((file) => file.name === filename);
      return Boolean(docx.files[filename]);
    };

    if (hasFile('word/comments.xml')) {
      const commentsDef = `<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml" />`;
      if (!hasComments) typesString += commentsDef;
    }

    if (hasFile('word/commentsExtended.xml')) {
      const commentsExtendedDef = `<Override PartName="/word/commentsExtended.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtended+xml" />`;
      if (!hasCommentsExtended) typesString += commentsExtendedDef;
    }

    if (hasFile('word/commentsIds.xml')) {
      const commentsIdsDef = `<Override PartName="/word/commentsIds.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.commentsIds+xml" />`;
      if (!hasCommentsIds) typesString += commentsIdsDef;
    }

    if (hasFile('word/commentsExtensible.xml')) {
      const commentsExtendedDef = `<Override PartName="/word/commentsExtensible.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtensible+xml" />`;
      if (!hasCommentsExtensible) typesString += commentsExtendedDef;
    }

    const partNames = new Set<string>(additionalPartNames);
    if (docx && 'files' in docx) {
      if (fromJson && Array.isArray(docx.files)) {
        docx.files.forEach((file) => partNames.add(file.name));
      } else {
        Object.keys(docx.files).forEach((key) => partNames.add(key));
      }
    }

    partNames.forEach((name) => {
      if (name.includes('.rels')) return;
      if (!name.includes('header') && !name.includes('footer')) return;
      const hasExtensible = types.elements?.some(
        (el: { name: string; attributes: { PartName: string } }) =>
          el.name === 'Override' && el.attributes.PartName === `/${name}`,
      );
      const type = name.includes('header') ? 'header' : 'footer';
      const extendedDef = `<Override PartName="/${name}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${type}+xml"/>`;
      if (!hasExtensible) {
        typesString += extendedDef;
      }
    });

    const beginningString = '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">';
    let updatedContentTypesXml = contentTypesXml.replace(beginningString, `${beginningString}${typesString}`);

    // Include any header/footer targets referenced from document relationships
    let relationshipsXml = updatedDocs['word/_rels/document.xml.rels'];
    if (!relationshipsXml) {
      if (fromJson) {
        if ('files' in docx && Array.isArray(docx.files)) {
          relationshipsXml = docx.files.find((file) => file.name === 'word/_rels/document.xml.rels')?.content;
        } else if ('files' in docx) {
          relationshipsXml = docx.files?.['word/_rels/document.xml.rels'];
        }
      } else {
        relationshipsXml = await (docx as JSZip).file('word/_rels/document.xml.rels')?.async('string');
      }
    }

    if (relationshipsXml) {
      try {
        const relJson = xmljs.xml2js(relationshipsXml, { compact: false });
        const relationships = relJson.elements?.find((el: { name: string }) => el.name === 'Relationships');
        relationships?.elements?.forEach((rel: { attributes?: { Type?: string; Target?: string } }) => {
          const type = rel.attributes?.Type;
          const target = rel.attributes?.Target;
          if (!type || !target) return;
          const isHeader = type.includes('/header');
          const isFooter = type.includes('/footer');
          if (!isHeader && !isFooter) return;
          let sanitizedTarget = target.replace(/^\.\//, '');
          if (sanitizedTarget.startsWith('../')) sanitizedTarget = sanitizedTarget.slice(3);
          if (sanitizedTarget.startsWith('/')) sanitizedTarget = sanitizedTarget.slice(1);
          const partName = sanitizedTarget.startsWith('word/') ? sanitizedTarget : `word/${sanitizedTarget}`;
          partNames.add(partName);
        });
      } catch (error) {
        console.warn('Failed to parse document relationships while updating content types', error);
      }
    }

    partNames.forEach((name) => {
      if (name.includes('.rels')) return;
      if (!name.includes('header') && !name.includes('footer')) return;
      if (updatedContentTypesXml.includes(`PartName="/${name}"`)) return;
      const type = name.includes('header') ? 'header' : 'footer';
      const extendedDef = `<Override PartName="/${name}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${type}+xml"/>`;
      updatedContentTypesXml = updatedContentTypesXml.replace('</Types>', `${extendedDef}</Types>`);
    });

    if (fromJson) return updatedContentTypesXml;

    (docx as JSZip).file(contentTypesPath, updatedContentTypesXml);
  }

  async unzip(file: File | Blob | Buffer | ArrayBuffer): Promise<JSZip> {
    const zip = await this.zip.loadAsync(file);
    return zip;
  }

  async updateZip({
    docx,
    updatedDocs,
    originalDocxFile,
    media,
    fonts,
    isHeadless,
  }: UpdateZipParams): Promise<Blob | Buffer> {
    // We use a different re-zip process if we have the original docx vs the docx xml metadata
    let zip: JSZip;

    if (originalDocxFile) {
      zip = await this.exportFromOriginalFile(originalDocxFile, updatedDocs, media);
    } else {
      zip = await this.exportFromCollaborativeDocx(docx, updatedDocs, media, fonts);
    }

    // If we are headless we don't have 'blob' support, so export as 'nodebuffer'
    const exportType = isHeadless ? 'nodebuffer' : 'blob';
    return await zip.generateAsync({ type: exportType });
  }

  /**
   * Export the Editor content to a docx file, updating changed docs
   * @param docx An object containing the unzipped docx files (keys are relative file names)
   * @param updatedDocs An object containing the updated docs (keys are relative file names)
   * @returns The unzipped but updated docx file ready for zipping
   */
  async exportFromCollaborativeDocx(
    docx: DocxFile[] | Record<string, string>,
    updatedDocs: UpdatedDocs,
    media: MediaFiles,
    fonts: Fonts,
  ): Promise<JSZip> {
    const zip = new JSZip();

    // Rebuild original files
    if (Array.isArray(docx)) {
      for (const file of docx) {
        const content = file.content;
        zip.file(file.name, content);
      }
    }

    // Replace updated docs
    Object.keys(updatedDocs).forEach((key) => {
      const content = updatedDocs[key];
      zip.file(key, content);
    });

    Object.keys(media).forEach((path) => {
      const binaryData = Buffer.from(media[path], 'base64');
      zip.file(path, binaryData);
    });

    // Export font files
    for (const [fontName, fontUintArray] of Object.entries(fonts)) {
      zip.file(fontName, fontUintArray);
    }

    await this.updateContentTypes(zip, media, false, updatedDocs);
    return zip;
  }

  /**
   * Export the Editor content to a docx file, updating changed docs
   * Requires the original docx file
   * @param originalDocxFile The original docx file
   * @param updatedDocs An object containing the updated docs (keys are relative file names)
   * @returns The unzipped but updated docx file ready for zipping
   */
  async exportFromOriginalFile(
    originalDocxFile: File | Blob | Buffer,
    updatedDocs: UpdatedDocs,
    media: MediaFiles,
  ): Promise<JSZip> {
    const unzippedOriginalDocx = await this.unzip(originalDocxFile);
    const filePromises: Promise<void>[] = [];
    unzippedOriginalDocx.forEach((relativePath: string, zipEntry: JSZipObject) => {
      const promise = zipEntry.async('string').then((content) => {
        unzippedOriginalDocx.file(zipEntry.name, content);
      });
      filePromises.push(promise);
    });
    await Promise.all(filePromises);

    // Make replacements of updated docs
    Object.keys(updatedDocs).forEach((key) => {
      unzippedOriginalDocx.file(key, updatedDocs[key]);
    });

    Object.keys(media).forEach((path) => {
      unzippedOriginalDocx.file(path, media[path]);
    });

    await this.updateContentTypes(unzippedOriginalDocx, media, false, updatedDocs);

    return unzippedOriginalDocx;
  }
}

export default DocxZipper;
