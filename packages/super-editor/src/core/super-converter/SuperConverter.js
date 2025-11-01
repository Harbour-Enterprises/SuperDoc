import xmljs from 'xml-js';
import { v4 as uuidv4 } from 'uuid';
import crc32 from 'buffer-crc32';
import { DocxExporter, exportSchemaToJson } from './exporter';
import { createDocumentJson, addDefaultStylesIfMissing } from './v2/importer/docxImporter.js';
import { deobfuscateFont, getArrayBufferFromUrl } from './helpers.js';
import { baseNumbering } from './v2/exporter/helpers/base-list.definitions.js';
import { DEFAULT_CUSTOM_XML, DEFAULT_DOCX_DEFS } from './exporter-docx-defs.js';
import {
  getCommentDefinition,
  prepareCommentParaIds,
  prepareCommentsXmlFilesForExport,
} from './v2/exporter/commentsExporter.js';
import { FOOTER_RELATIONSHIP_TYPE, HEADER_RELATIONSHIP_TYPE, HYPERLINK_RELATIONSHIP_TYPE } from './constants.js';
import { DocxHelpers } from './docx-helpers/index.js';

const FONT_FAMILY_FALLBACKS = Object.freeze({
  swiss: 'Arial, sans-serif',
  roman: 'Times New Roman, serif',
  modern: 'Courier New, monospace',
  script: 'cursive',
  decorative: 'fantasy',
  system: 'system-ui',
  auto: 'sans-serif',
});

const DEFAULT_GENERIC_FALLBACK = 'sans-serif';
const DEFAULT_FONT_SIZE_PT = 10;

/**
 * Pull default run formatting (font family, size, kern) out of a DOCX run properties node.
 * Mutates the supplied state object with any discovered values.
 */
const collectRunDefaultProperties = (
  runProps,
  { allowOverrideTypeface = true, allowOverrideSize = true, themeResolver, state },
) => {
  if (!runProps?.elements?.length || !state) return;

  const fontsNode = runProps.elements.find((el) => el.name === 'w:rFonts');
  if (fontsNode?.attributes) {
    const themeName = fontsNode.attributes['w:asciiTheme'];
    if (themeName) {
      const themeInfo = themeResolver?.(themeName) || {};
      if ((allowOverrideTypeface || !state.typeface) && themeInfo.typeface) state.typeface = themeInfo.typeface;
      if ((allowOverrideTypeface || !state.panose) && themeInfo.panose) state.panose = themeInfo.panose;
    }

    const ascii = fontsNode.attributes['w:ascii'];
    if ((allowOverrideTypeface || !state.typeface) && ascii) {
      state.typeface = ascii;
    }
  }

  const sizeNode = runProps.elements.find((el) => el.name === 'w:sz');
  if (sizeNode?.attributes?.['w:val']) {
    const sizeTwips = Number(sizeNode.attributes['w:val']);
    if (Number.isFinite(sizeTwips)) {
      if (state.fallbackSzTwips === undefined) state.fallbackSzTwips = sizeTwips;
      const sizePt = sizeTwips / 2;
      if (allowOverrideSize || state.fontSizePt === undefined) state.fontSizePt = sizePt;
    }
  }

  const kernNode = runProps.elements.find((el) => el.name === 'w:kern');
  if (kernNode?.attributes?.['w:val']) {
    if (allowOverrideSize || state.kern === undefined) state.kern = kernNode.attributes['w:val'];
  }
};

class SuperConverter {
  static allowedElements = Object.freeze({
    'w:document': 'doc',
    'w:body': 'body',
    'w:p': 'paragraph',
    'w:r': 'run',
    'w:t': 'text',
    'w:delText': 'text',
    'w:br': 'lineBreak',
    'w:tbl': 'table',
    'w:tr': 'tableRow',
    'w:tc': 'tableCell',
    'w:drawing': 'drawing',
    'w:bookmarkStart': 'bookmarkStart',
    // 'w:tab': 'tab',

    // Formatting only
    'w:sectPr': 'sectionProperties',
    'w:rPr': 'runProperties',

    // Comments
    'w:commentRangeStart': 'commentRangeStart',
    'w:commentRangeEnd': 'commentRangeEnd',
    'w:commentReference': 'commentReference',
  });

  static markTypes = [
    { name: 'w:b', type: 'bold', property: 'value' },
    // { name: 'w:bCs', type: 'bold' },
    { name: 'w:i', type: 'italic' },
    // { name: 'w:iCs', type: 'italic' },
    { name: 'w:u', type: 'underline', mark: 'underline', property: 'underlineType' },
    { name: 'w:strike', type: 'strike', mark: 'strike' },
    { name: 'w:color', type: 'color', mark: 'textStyle', property: 'color' },
    { name: 'w:sz', type: 'fontSize', mark: 'textStyle', property: 'fontSize' },
    // { name: 'w:szCs', type: 'fontSize', mark: 'textStyle', property: 'fontSize' },
    { name: 'w:rFonts', type: 'fontFamily', mark: 'textStyle', property: 'fontFamily' },
    { name: 'w:rStyle', type: 'styleId', mark: 'textStyle', property: 'styleId' },
    { name: 'w:jc', type: 'textAlign', mark: 'textStyle', property: 'textAlign' },
    { name: 'w:ind', type: 'textIndent', mark: 'textStyle', property: 'textIndent' },
    { name: 'w:spacing', type: 'lineHeight', mark: 'textStyle', property: 'lineHeight' },
    { name: 'w:spacing', type: 'letterSpacing', mark: 'textStyle', property: 'letterSpacing' },
    { name: 'link', type: 'link', mark: 'link', property: 'href' },
    { name: 'w:highlight', type: 'highlight', mark: 'highlight', property: 'color' },
    { name: 'w:shd', type: 'highlight', mark: 'highlight', property: 'color' },
    { name: 'w:caps', type: 'textTransform', mark: 'textStyle', property: 'textTransform' },
  ];

  static propertyTypes = Object.freeze({
    'w:pPr': 'paragraphProperties',
    'w:rPr': 'runProperties',
    'w:sectPr': 'sectionProperties',
    'w:numPr': 'numberingProperties',
    'w:tcPr': 'tableCellProperties',
  });

  static elements = new Set(['w:document', 'w:body', 'w:p', 'w:r', 'w:t', 'w:delText']);

  static getFontTableEntry(docx, fontName) {
    if (!docx || !fontName) return null;
    const fontTable = docx['word/fontTable.xml'];
    if (!fontTable?.elements?.length) return null;
    const fontsNode = fontTable.elements.find((el) => el.name === 'w:fonts');
    if (!fontsNode?.elements?.length) return null;
    return fontsNode.elements.find((el) => el?.attributes?.['w:name'] === fontName) || null;
  }

  static getFallbackFromFontTable(docx, fontName) {
    const fontEntry = SuperConverter.getFontTableEntry(docx, fontName);
    const family = fontEntry?.elements?.find((child) => child.name === 'w:family')?.attributes?.['w:val'];
    if (!family) return null;
    const mapped = FONT_FAMILY_FALLBACKS[family.toLowerCase()];
    return mapped || DEFAULT_GENERIC_FALLBACK;
  }

  static toCssFontFamily(fontName, docx) {
    if (!fontName) return fontName;
    if (fontName.includes(',')) return fontName;

    const fallback = SuperConverter.getFallbackFromFontTable(docx, fontName) || DEFAULT_GENERIC_FALLBACK;

    const normalizedFallbackParts = fallback
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);

    if (normalizedFallbackParts.includes(fontName.trim().toLowerCase())) {
      return fallback;
    }

    return `${fontName}, ${fallback}`;
  }

  constructor(params = null) {
    // Suppress logging when true
    this.debug = params?.debug || false;

    // Important docx pieces
    this.declaration = null;
    this.documentAttributes = null;

    // The docx as a list of files
    this.convertedXml = {};
    this.docx = params?.docx || [];
    this.media = params?.media || {};

    this.fonts = params?.fonts || {};

    this.addedMedia = {};
    this.comments = [];
    this.inlineDocumentFonts = [];

    // Store custom highlight colors
    this.docHiglightColors = new Set([]);

    // XML inputs
    this.xml = params?.xml;
    this.declaration = null;

    // List defs
    this.numbering = {};

    // Processed additional content
    this.numbering = null;
    this.pageStyles = null;

    // The JSON converted XML before any processing. This is simply the result of xml2json
    this.initialJSON = null;

    // Headers and footers
    this.headers = {};
    this.headerIds = { default: null, even: null, odd: null, first: null };
    this.headerEditors = [];
    this.footers = {};
    this.footerIds = { default: null, even: null, odd: null, first: null };
    this.footerEditors = [];

    // Linked Styles
    this.linkedStyles = [];

    // This is the JSON schema that we will be working with
    this.json = params?.json;

    this.tagsNotInSchema = ['w:body'];
    this.savedTagsToRestore = [];

    // Initialize telemetry
    this.telemetry = params?.telemetry || null;
    this.documentInternalId = null;

    // Uploaded file
    this.fileSource = params?.fileSource || null;
    this.documentId = params?.documentId || null;

    // Document identification
    this.documentGuid = null; // Permanent GUID for modified documents
    this.documentHash = null; // Temporary hash for unmodified documents
    this.documentModified = false; // Track if document has been edited

    // Parse the initial XML, if provided
    if (this.docx.length || this.xml) this.parseFromXml();
  }

  /**
   * Get the DocxHelpers object that contains utility functions for working with docx files.
   * @returns {import('./docx-helpers/docx-helpers.js').DocxHelpers} The DocxHelpers object.
   */
  get docxHelpers() {
    return DocxHelpers;
  }

  parseFromXml() {
    this.docx?.forEach((file) => {
      this.convertedXml[file.name] = this.parseXmlToJson(file.content);

      if (file.name === 'word/document.xml') {
        this.documentAttributes = this.convertedXml[file.name].elements[0]?.attributes;
      }

      if (file.name === 'word/styles.xml') {
        this.convertedXml[file.name] = addDefaultStylesIfMissing(this.convertedXml[file.name]);
      }
    });
    this.initialJSON = this.convertedXml['word/document.xml'];

    if (!this.initialJSON) this.initialJSON = this.parseXmlToJson(this.xml);
    this.declaration = this.initialJSON?.declaration;

    // Only resolve existing GUIDs synchronously (no hash generation yet)
    this.resolveDocumentGuid();
  }

  parseXmlToJson(xml) {
    // We need to preserve nodes with xml:space="preserve" and only have empty spaces
    const newXml = xml.replace(/(<w:t xml:space="preserve">)(\s+)(<\/w:t>)/g, '$1[[sdspace]]$2[[sdspace]]$3');
    return JSON.parse(xmljs.xml2json(newXml, null, 2));
  }

  /**
   * Generic method to get a stored custom property from docx
   * @static
   * @param {Array} docx - Array of docx file objects
   * @param {string} propertyName - Name of the property to retrieve
   * @returns {string|null} The property value or null if not found
   */
  static getStoredCustomProperty(docx, propertyName) {
    try {
      const customXml = docx.find((doc) => doc.name === 'docProps/custom.xml');
      if (!customXml) return null;

      const converter = new SuperConverter();
      const content = customXml.content;
      const contentJson = converter.parseXmlToJson(content);
      const properties = contentJson.elements.find((el) => el.name === 'Properties');
      if (!properties.elements) return null;

      const property = properties.elements.find((el) => el.name === 'property' && el.attributes.name === propertyName);
      if (!property) return null;

      return property.elements[0].elements[0].text;
    } catch (e) {
      console.warn(`Error getting custom property ${propertyName}:`, e);
      return null;
    }
  }

  /**
   * Generic method to set a stored custom property in docx
   * @static
   * @param {Object} docx - The docx object to store the property in
   * @param {string} propertyName - Name of the property
   * @param {string|Function} value - Value or function that returns the value
   * @param {boolean} preserveExisting - If true, won't overwrite existing values
   * @returns {string} The stored value
   */
  static setStoredCustomProperty(docx, propertyName, value, preserveExisting = false) {
    const customLocation = 'docProps/custom.xml';
    if (!docx[customLocation]) docx[customLocation] = generateCustomXml();

    const customXml = docx[customLocation];
    const properties = customXml.elements?.find((el) => el.name === 'Properties');
    if (!properties) return null;
    if (!properties.elements) properties.elements = [];

    // Check if property already exists
    let property = properties.elements.find((el) => el.name === 'property' && el.attributes.name === propertyName);

    if (property && preserveExisting) {
      // Return existing value
      return property.elements[0].elements[0].text;
    }

    // Generate value if it's a function
    const finalValue = typeof value === 'function' ? value() : value;

    if (!property) {
      // Get next available pid
      const existingPids = properties.elements
        .filter((el) => el.attributes?.pid)
        .map((el) => parseInt(el.attributes.pid, 10)) // Add radix for clarity
        .filter(Number.isInteger); // Use isInteger instead of isFinite since PIDs should be integers
      const pid = existingPids.length > 0 ? Math.max(...existingPids) + 1 : 2;

      property = {
        type: 'element',
        name: 'property',
        attributes: {
          name: propertyName,
          fmtid: '{D5CDD505-2E9C-101B-9397-08002B2CF9AE}',
          pid,
        },
        elements: [
          {
            type: 'element',
            name: 'vt:lpwstr',
            elements: [
              {
                type: 'text',
                text: finalValue,
              },
            ],
          },
        ],
      };

      properties.elements.push(property);
    } else {
      // Update existing property
      property.elements[0].elements[0].text = finalValue;
    }

    return finalValue;
  }

  static getStoredSuperdocVersion(docx) {
    return SuperConverter.getStoredCustomProperty(docx, 'SuperdocVersion');
  }

  static setStoredSuperdocVersion(docx = this.convertedXml, version = __APP_VERSION__) {
    return SuperConverter.setStoredCustomProperty(docx, 'SuperdocVersion', version, false);
  }

  /**
   * Get document GUID from docx files (static method)
   * @static
   * @param {Array} docx - Array of docx file objects
   * @returns {string|null} The document GUID
   */
  static extractDocumentGuid(docx) {
    try {
      const settingsXml = docx.find((doc) => doc.name === 'word/settings.xml');
      if (!settingsXml) return null;

      // Parse XML properly instead of regex
      const converter = new SuperConverter();
      const settingsJson = converter.parseXmlToJson(settingsXml.content);

      // Navigate the parsed structure to find w15:docId
      const settings = settingsJson.elements?.[0];
      if (!settings) return null;

      const docIdElement = settings.elements?.find((el) => el.name === 'w15:docId');
      if (docIdElement?.attributes?.['w15:val']) {
        return docIdElement.attributes['w15:val'].replace(/[{}]/g, '');
      }
    } catch {
      // Continue to check custom property
    }

    // Then check custom property
    return SuperConverter.getStoredCustomProperty(docx, 'DocumentGuid');
  }

  /**
   * Get the permanent document GUID
   * @returns {string|null} The document GUID (only for modified documents)
   */
  getDocumentGuid() {
    return this.documentGuid;
  }

  /**
   * Get the SuperDoc version for this converter instance
   * @returns {string|null} The SuperDoc version or null if not available
   */
  getSuperdocVersion() {
    if (this.docx) {
      return SuperConverter.getStoredSuperdocVersion(this.docx);
    }
    return null;
  }

  /**
   * Resolve existing document GUID (synchronous)
   */
  resolveDocumentGuid() {
    // 1. Check Microsoft's docId (READ ONLY)
    const microsoftGuid = this.getMicrosoftDocId();
    if (microsoftGuid) {
      this.documentGuid = microsoftGuid;
      return;
    }

    // 2. Check our custom property
    const customGuid = SuperConverter.getStoredCustomProperty(this.docx, 'DocumentGuid');
    if (customGuid) {
      this.documentGuid = customGuid;
    }
    // Don't generate hash here - do it lazily when needed
  }

  /**
   * Get Microsoft's docId from settings.xml (READ ONLY)
   */
  getMicrosoftDocId() {
    this.getDocumentInternalId(); // Existing method
    if (this.documentInternalId) {
      return this.documentInternalId.replace(/[{}]/g, '');
    }
    return null;
  }

  /**
   * Generate document hash for telemetry (async, lazy)
   */
  async #generateDocumentHash() {
    if (!this.fileSource) return `HASH-${Date.now()}`;

    try {
      let buffer;

      if (Buffer.isBuffer(this.fileSource)) {
        buffer = this.fileSource;
      } else if (this.fileSource instanceof ArrayBuffer) {
        buffer = Buffer.from(this.fileSource);
      } else if (this.fileSource instanceof Blob || this.fileSource instanceof File) {
        const arrayBuffer = await this.fileSource.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else {
        return `HASH-${Date.now()}`;
      }

      const hash = crc32(buffer);
      return `HASH-${hash.toString('hex').toUpperCase()}`;
    } catch (e) {
      console.warn('Could not generate document hash:', e);
      return `HASH-${Date.now()}`;
    }
  }

  /**
   * Get document identifier (GUID or hash) - async for lazy hash generation
   */
  async getDocumentIdentifier() {
    if (this.documentGuid) {
      return this.documentGuid;
    }

    if (!this.documentHash && this.fileSource) {
      this.documentHash = await this.#generateDocumentHash();
    }

    return this.documentHash;
  }

  /**
   * Promote from hash to GUID on first edit
   */
  promoteToGuid() {
    if (this.documentGuid) return this.documentGuid;

    this.documentGuid = this.getMicrosoftDocId() || uuidv4();
    this.documentModified = true;
    this.documentHash = null; // Clear temporary hash

    // Note: GUID is stored to custom properties during export to avoid
    // unnecessary XML modifications if the document is never saved
    return this.documentGuid;
  }

  getDocumentDefaultStyles() {
    const styles = this.convertedXml['word/styles.xml'];
    const styleRoot = styles?.elements?.[0];
    const styleElements = styleRoot?.elements || [];
    if (!styleElements.length) return {};

    const defaults = styleElements.find((el) => el.name === 'w:docDefaults');
    const normalStyle = styleElements.find((el) => el.name === 'w:style' && el.attributes?.['w:styleId'] === 'Normal');

    const defaultsState = {
      typeface: undefined,
      panose: undefined,
      fontSizePt: undefined,
      kern: undefined,
      fallbackSzTwips: undefined,
    };

    const docDefaultRun = defaults?.elements?.find((el) => el.name === 'w:rPrDefault');
    const docDefaultProps = docDefaultRun?.elements?.find((el) => el.name === 'w:rPr') ?? docDefaultRun;
    collectRunDefaultProperties(docDefaultProps, {
      allowOverrideTypeface: true,
      allowOverrideSize: true,
      themeResolver: (theme) => this.getThemeInfo(theme),
      state: defaultsState,
    });

    const normalRunProps = normalStyle?.elements?.find((el) => el.name === 'w:rPr') ?? null;
    collectRunDefaultProperties(normalRunProps, {
      allowOverrideTypeface: true,
      allowOverrideSize: true,
      themeResolver: (theme) => this.getThemeInfo(theme),
      state: defaultsState,
    });

    if (defaultsState.fontSizePt === undefined) {
      if (Number.isFinite(defaultsState.fallbackSzTwips)) defaultsState.fontSizePt = defaultsState.fallbackSzTwips / 2;
      else defaultsState.fontSizePt = DEFAULT_FONT_SIZE_PT;
    }

    const fontFamilyCss = defaultsState.typeface
      ? SuperConverter.toCssFontFamily(defaultsState.typeface, this.convertedXml)
      : undefined;

    const result = {};
    if (defaultsState.fontSizePt !== undefined) result.fontSizePt = defaultsState.fontSizePt;
    if (defaultsState.kern !== undefined) result.kern = defaultsState.kern;
    if (defaultsState.typeface) result.typeface = defaultsState.typeface;
    if (defaultsState.panose) result.panose = defaultsState.panose;
    if (fontFamilyCss) result.fontFamilyCss = fontFamilyCss;

    return result;
  }

  getDocumentFonts() {
    const inlineDocumentFonts = [...new Set(this.inlineDocumentFonts || [])];
    const fontTable = this.convertedXml['word/fontTable.xml'];
    if (!fontTable) {
      return inlineDocumentFonts;
    }

    const wFonts = fontTable.elements?.find((element) => element.name === 'w:fonts');
    if (!wFonts) {
      return inlineDocumentFonts;
    }

    if (!wFonts.elements) {
      return inlineDocumentFonts;
    }

    const fontsInFontTable = wFonts.elements
      .filter((element) => element.name === 'w:font')
      .map((element) => element.attributes['w:name']);

    const allFonts = [...inlineDocumentFonts, ...fontsInFontTable];
    return [...new Set(allFonts)];
  }

  getFontFaceImportString() {
    const fontTable = this.convertedXml['word/fontTable.xml'];
    if (!fontTable || !Object.keys(this.fonts).length) return;

    const fonts = fontTable.elements.find((el) => el.name === 'w:fonts');
    const embededFonts = fonts?.elements.filter((el) =>
      el.elements?.some((nested) => nested?.attributes && nested.attributes['r:id'] && nested.attributes['w:fontKey']),
    );
    const fontsToInclude = embededFonts?.reduce((acc, cur) => {
      const embedElements = cur.elements
        .filter((el) => el.name.startsWith('w:embed'))
        ?.map((el) => ({ ...el, fontFamily: cur.attributes['w:name'] }));
      return [...acc, ...embedElements];
    }, []);

    const rels = this.convertedXml['word/_rels/fontTable.xml.rels'];
    const relationships = rels?.elements.find((el) => el.name === 'Relationships') || {};
    const { elements } = relationships;

    const fontsImported = [];
    let styleString = '';
    for (const font of fontsToInclude) {
      const filePath = elements.find((el) => el.attributes.Id === font.attributes['r:id'])?.attributes?.Target;
      if (!filePath) return;

      const fontUint8Array = this.fonts[`word/${filePath}`];
      const fontBuffer = fontUint8Array?.buffer;
      if (!fontBuffer) return;

      const ttfBuffer = deobfuscateFont(fontBuffer, font.attributes['w:fontKey']);
      if (!ttfBuffer) return;

      // Convert to a blob and inject @font-face
      const blob = new Blob([ttfBuffer], { type: 'font/ttf' });
      const fontUrl = URL.createObjectURL(blob);
      const isNormal = font.name.includes('Regular');
      const isBold = font.name.includes('Bold');
      const isItalic = font.name.includes('Italic');
      const isLight = font.name.includes('Light');
      const fontWeight = isNormal ? 'normal' : isBold ? 'bold' : isLight ? '200' : 'normal';

      if (!fontsImported.includes(font.fontFamily)) {
        fontsImported.push(font.fontFamily);
      }

      styleString += `
        @font-face {
          font-style: ${isItalic ? 'italic' : 'normal'};
          font-weight: ${fontWeight};
          font-display: swap;
          font-family: ${font.fontFamily};
          src: url(${fontUrl}) format('truetype');
        }
      `;
    }

    return {
      styleString,
      fontsImported,
    };
  }

  getDocumentInternalId() {
    const settingsLocation = 'word/settings.xml';
    if (!this.convertedXml[settingsLocation]) {
      // Don't create settings if it doesn't exist during read
      return;
    }

    const settings = this.convertedXml[settingsLocation];
    if (!settings.elements?.[0]?.elements?.length) {
      return;
    }

    // Look for existing w15:docId only
    const w15DocId = settings.elements[0].elements.find((el) => el.name === 'w15:docId');
    this.documentInternalId = w15DocId?.attributes?.['w15:val'];
  }

  createDocumentIdElement() {
    // This should only be called when WRITING, never when reading
    const docId = uuidv4().toUpperCase();
    this.documentInternalId = docId;

    return {
      type: 'element',
      name: 'w15:docId',
      attributes: {
        'w15:val': `{${docId}}`,
      },
    };
  }

  getThemeInfo(themeName) {
    themeName = themeName.toLowerCase();
    const theme1 = this.convertedXml['word/theme/theme1.xml'];
    if (!theme1) return {};
    const themeData = theme1.elements.find((el) => el.name === 'a:theme');
    const themeElements = themeData.elements.find((el) => el.name === 'a:themeElements');
    const fontScheme = themeElements.elements.find((el) => el.name === 'a:fontScheme');
    let fonts;

    if (themeName.startsWith('major')) {
      fonts = fontScheme.elements.find((el) => el.name === 'a:majorFont').elements[0];
    } else if (themeName.startsWith('minor')) {
      fonts = fontScheme.elements.find((el) => el.name === 'a:minorFont').elements[0];
    }

    const { typeface, panose } = fonts.attributes;
    return { typeface, panose };
  }

  getSchema(editor) {
    let result;
    try {
      this.getDocumentInternalId();
      result = createDocumentJson({ ...this.convertedXml, media: this.media }, this, editor);
    } catch (error) {
      editor?.emit('exception', { error, editor });
    }

    if (result) {
      this.savedTagsToRestore.push({ ...result.savedTagsToRestore });
      this.pageStyles = result.pageStyles;
      this.numbering = result.numbering;
      this.comments = result.comments;
      this.linkedStyles = result.linkedStyles;
      this.inlineDocumentFonts = result.inlineDocumentFonts;

      return result.pmDoc;
    } else {
      return null;
    }
  }

  schemaToXml(data, debug = false) {
    const exporter = new DocxExporter(this);
    return exporter.schemaToXml(data, debug);
  }

  async exportToDocx(
    jsonData,
    editorSchema,
    documentMedia,
    isFinalDoc = false,
    commentsExportType,
    comments = [],
    editor,
    exportJsonOnly = false,
    fieldsHighlightColor,
  ) {
    const commentsWithParaIds = comments.map((c) => prepareCommentParaIds(c));
    const commentDefinitions = commentsWithParaIds.map((c, index) =>
      getCommentDefinition(c, index, commentsWithParaIds, editor),
    );

    const { result, params } = this.exportToXmlJson({
      data: jsonData,
      editorSchema,
      comments,
      commentDefinitions,
      commentsExportType,
      isFinalDoc,
      editor,
      fieldsHighlightColor,
    });

    if (exportJsonOnly) return result;

    const exporter = new DocxExporter(this);
    const xml = exporter.schemaToXml(result);

    // Update media
    await this.#exportProcessMediaFiles(
      {
        ...documentMedia,
        ...params.media,
        ...this.media,
      },
      editor,
    );

    // Update content types and comments files as needed
    let updatedXml = { ...this.convertedXml };
    let commentsRels = [];
    if (comments.length) {
      const { documentXml, relationships } = this.#prepareCommentsXmlFilesForExport({
        defs: params.exportedCommentDefs,
        exportType: commentsExportType,
        commentsWithParaIds,
      });
      updatedXml = { ...documentXml };
      commentsRels = relationships;
    }

    this.convertedXml = { ...this.convertedXml, ...updatedXml };

    const headFootRels = this.#exportProcessHeadersFooters({ isFinalDoc });

    // Update the rels table
    this.#exportProcessNewRelationships([...params.relationships, ...commentsRels, ...headFootRels]);

    // Store SuperDoc version
    SuperConverter.setStoredSuperdocVersion(this.convertedXml);

    // Store document GUID if document was modified
    if (this.documentModified || this.documentGuid) {
      if (!this.documentGuid) {
        this.documentGuid = this.getMicrosoftDocId() || uuidv4();
      }

      // Always store in custom.xml (never modify settings.xml)
      SuperConverter.setStoredCustomProperty(this.convertedXml, 'DocumentGuid', this.documentGuid, true);
    }

    // Update the numbering.xml
    this.#exportNumberingFile(params);

    return xml;
  }

  exportToXmlJson({
    data,
    editorSchema,
    comments,
    commentDefinitions,
    commentsExportType = 'clean',
    isFinalDoc = false,
    editor,
    isHeaderFooter = false,
    fieldsHighlightColor = null,
  }) {
    const bodyNode = this.savedTagsToRestore.find((el) => el.name === 'w:body');

    const [result, params] = exportSchemaToJson({
      node: data,
      bodyNode,
      relationships: [],
      documentMedia: {},
      media: {},
      isFinalDoc,
      editorSchema,
      converter: this,
      pageStyles: this.pageStyles,
      comments,
      commentsExportType,
      exportedCommentDefs: commentDefinitions,
      editor,
      isHeaderFooter,
      fieldsHighlightColor,
    });

    return { result, params };
  }

  #exportNumberingFile() {
    const numberingPath = 'word/numbering.xml';
    let numberingXml = this.convertedXml[numberingPath];

    const newNumbering = this.numbering;

    if (!numberingXml) numberingXml = baseNumbering;
    const currentNumberingXml = numberingXml.elements[0];

    const newAbstracts = Object.values(newNumbering.abstracts).map((entry) => entry);
    const newNumDefs = Object.values(newNumbering.definitions).map((entry) => entry);
    currentNumberingXml.elements = [...newAbstracts, ...newNumDefs];

    // Update the numbering file
    this.convertedXml[numberingPath] = numberingXml;
  }

  /**
   * Update comments files and relationships depending on export type
   */
  #prepareCommentsXmlFilesForExport({ defs, exportType, commentsWithParaIds }) {
    const { documentXml, relationships } = prepareCommentsXmlFilesForExport({
      exportType,
      convertedXml: this.convertedXml,
      defs,
      commentsWithParaIds,
      converter: this,
    });

    return { documentXml, relationships };
  }

  #exportProcessHeadersFooters({ isFinalDoc = false }) {
    const relsData = this.convertedXml['word/_rels/document.xml.rels'];
    const relationships = relsData.elements.find((x) => x.name === 'Relationships');
    const newDocRels = [];

    Object.entries(this.headers).forEach(([id, header], index) => {
      const fileName =
        relationships.elements.find((el) => el.attributes.Id === id)?.attributes.Target || `header${index + 1}.xml`;
      const headerEditor = this.headerEditors.find((item) => item.id === id);

      if (!headerEditor) return;

      const { result, params } = this.exportToXmlJson({
        data: header,
        editor: headerEditor.editor,
        editorSchema: headerEditor.editor.schema,
        comments: [],
        commentDefinitions: [],
        isHeaderFooter: true,
        isFinalDoc,
      });

      const bodyContent = result.elements[0].elements;
      const file = this.convertedXml[`word/${fileName}`];

      if (!file) {
        this.convertedXml[`word/${fileName}`] = {
          declaration: this.initialJSON?.declaration,
          elements: [
            {
              attributes: DEFAULT_DOCX_DEFS,
              name: 'w:hdr',
              type: 'element',
              elements: [],
            },
          ],
        };
        newDocRels.push({
          type: 'element',
          name: 'Relationship',
          attributes: {
            Id: id,
            Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/header',
            Target: fileName,
          },
        });
      }

      this.convertedXml[`word/${fileName}`].elements[0].elements = bodyContent;

      if (params.relationships.length) {
        const relationships =
          this.convertedXml[`word/_rels/${fileName}.rels`]?.elements?.find((x) => x.name === 'Relationships')
            ?.elements || [];
        this.convertedXml[`word/_rels/${fileName}.rels`] = {
          declaration: this.initialJSON?.declaration,
          elements: [
            {
              name: 'Relationships',
              attributes: {
                xmlns: 'http://schemas.openxmlformats.org/package/2006/relationships',
              },
              elements: [...relationships, ...params.relationships],
            },
          ],
        };
      }
    });

    Object.entries(this.footers).forEach(([id, footer], index) => {
      const fileName =
        relationships.elements.find((el) => el.attributes.Id === id)?.attributes.Target || `footer${index + 1}.xml`;
      const footerEditor = this.footerEditors.find((item) => item.id === id);

      if (!footerEditor) return;

      const { result, params } = this.exportToXmlJson({
        data: footer,
        editor: footerEditor.editor,
        editorSchema: footerEditor.editor.schema,
        comments: [],
        commentDefinitions: [],
        isHeaderFooter: true,
        isFinalDoc,
      });

      const bodyContent = result.elements[0].elements;
      const file = this.convertedXml[`word/${fileName}`];

      if (!file) {
        this.convertedXml[`word/${fileName}`] = {
          declaration: this.initialJSON?.declaration,
          elements: [
            {
              attributes: DEFAULT_DOCX_DEFS,
              name: 'w:ftr',
              type: 'element',
              elements: [],
            },
          ],
        };
        newDocRels.push({
          type: 'element',
          name: 'Relationship',
          attributes: {
            Id: id,
            Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer',
            Target: fileName,
          },
        });
      }

      this.convertedXml[`word/${fileName}`].elements[0].elements = bodyContent;

      if (params.relationships.length) {
        const relationships =
          this.convertedXml[`word/_rels/${fileName}.rels`]?.elements?.find((x) => x.name === 'Relationships')
            ?.elements || [];
        this.convertedXml[`word/_rels/${fileName}.rels`] = {
          declaration: this.initialJSON?.declaration,
          elements: [
            {
              name: 'Relationships',
              attributes: {
                xmlns: 'http://schemas.openxmlformats.org/package/2006/relationships',
              },
              elements: [...relationships, ...params.relationships],
            },
          ],
        };
      }
    });

    return newDocRels;
  }

  #exportProcessNewRelationships(rels = []) {
    const relsData = this.convertedXml['word/_rels/document.xml.rels'];
    const relationships = relsData.elements.find((x) => x.name === 'Relationships');
    const newRels = [];

    const regex = /rId|mi/g;
    let largestId = Math.max(...relationships.elements.map((el) => Number(el.attributes.Id.replace(regex, ''))));

    rels.forEach((rel) => {
      const existingId = rel.attributes.Id;
      const existingTarget = relationships.elements.find((el) => el.attributes.Target === rel.attributes.Target);
      const isNewMedia = rel.attributes.Target?.startsWith('media/') && existingId.length > 6;
      const isNewHyperlink = rel.attributes.Type === HYPERLINK_RELATIONSHIP_TYPE && existingId.length > 6;
      const isNewHeadFoot =
        rel.attributes.Type === (HEADER_RELATIONSHIP_TYPE || rel.attributes.Type === FOOTER_RELATIONSHIP_TYPE) &&
        existingId.length > 6;

      if (existingTarget && !isNewMedia && !isNewHyperlink && !isNewHeadFoot) {
        return;
      }

      // Update the target to escape ampersands
      rel.attributes.Target = rel.attributes?.Target?.replace(/&/g, '&amp;');

      // Update the ID. If we've assigned a long ID (ie: images, links) we leave it alone
      rel.attributes.Id = existingId.length > 6 ? existingId : `rId${++largestId}`;

      newRels.push(rel);
    });

    relationships.elements = [...relationships.elements, ...newRels];
  }

  async #exportProcessMediaFiles(media = {}) {
    const processedData = {
      ...(this.convertedXml.media || {}),
    };

    for (const [filePath, value] of Object.entries(media)) {
      if (value == null) continue;
      processedData[filePath] = await getArrayBufferFromUrl(value);
    }

    this.convertedXml.media = processedData;
    this.media = this.convertedXml.media;
    this.addedMedia = {
      ...processedData,
    };
  }

  // Deprecated methods for backward compatibility
  static getStoredSuperdocId(docx) {
    console.warn('getStoredSuperdocId is deprecated, use getDocumentGuid instead');
    return SuperConverter.extractDocumentGuid(docx);
  }

  static updateDocumentVersion(docx, version) {
    console.warn('updateDocumentVersion is deprecated, use setStoredSuperdocVersion instead');
    return SuperConverter.setStoredSuperdocVersion(docx, version);
  }
}

function generateCustomXml() {
  return DEFAULT_CUSTOM_XML;
}

export { SuperConverter };
