import xmljs from 'xml-js';
import { v4 as uuidv4 } from 'uuid';

import { DocxExporter, exportSchemaToJson } from './exporter';
import { createDocumentJson } from './v2/importer/docxImporter.js';
import { getArrayBufferFromUrl } from './helpers.js';
import { getCommentDefinition, updateCommentsXml } from './v2/exporter/commentsExporter.js';
import { DEFAULT_CUSTOM_XML, SETTINGS_CUSTOM_XML } from './exporter-docx-defs.js';
import { COMMENTS_XML } from './exporter-docx-defs.js';

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
    { name: 'w:b', type: 'bold' },
    { name: 'w:bCs', type: 'bold' },
    { name: 'w:i', type: 'italic' },
    { name: 'w:iCs', type: 'italic' },
    { name: 'w:u', type: 'underline', mark: 'underline', property: 'underlineType' },
    { name: 'w:strike', type: 'strike' },
    { name: 'w:color', type: 'color', mark: 'textStyle', property: 'color' },
    { name: 'w:sz', type: 'fontSize', mark: 'textStyle', property: 'fontSize' },
    { name: 'w:szCs', type: 'fontSize', mark: 'textStyle', property: 'fontSize' },
    { name: 'w:rFonts', type: 'fontFamily', mark: 'textStyle', property: 'fontFamily' },
    { name: 'w:jc', type: 'textAlign', mark: 'textStyle', property: 'textAlign' },
    { name: 'w:ind', type: 'textIndent', mark: 'textStyle', property: 'textIndent' },
    { name: 'w:spacing', type: 'lineHeight', mark: 'textStyle', property: 'lineHeight' },
    { name: 'link', type: 'link', mark: 'link', property: 'href' },
    { name: 'w:highlight', type: 'highlight', mark: 'highlight', property: 'color' },
  ];

  static propertyTypes = Object.freeze({
    'w:pPr': 'paragraphProperties',
    'w:rPr': 'runProperties',
    'w:sectPr': 'sectionProperties',
    'w:numPr': 'numberingProperties',
    'w:tcPr': 'tableCellProperties',
  });

  static elements = new Set(['w:document', 'w:body', 'w:p', 'w:r', 'w:t', 'w:delText']);

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

    this.addedMedia = {};
    this.comments = [];

    // XML inputs
    this.xml = params?.xml;
    this.declaration = null;

    // Processed additional content
    this.numbering = null;
    this.pageStyles = null;

    // The JSON converted XML before any processing. This is simply the result of xml2json
    this.initialJSON = null;

    // Headers and footers
    this.headers = {};
    this.headerIds = { default: null, even: null, odd: null, first: null };
    this.footers = {};
    this.footerIds = { default: null, even: null, odd: null, first: null };

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

    // Parse the initial XML, if provided
    if (this.docx.length || this.xml) this.parseFromXml();
  }

  parseFromXml() {
    this.docx?.forEach((file) => {
      this.convertedXml[file.name] = this.parseXmlToJson(file.content);

      if (file.name === 'word/document.xml') {
        this.documentAttributes = this.convertedXml[file.name].elements[0]?.attributes;
      }
    });
    this.initialJSON = this.convertedXml['word/document.xml'];

    if (!this.initialJSON) this.initialJSON = this.parseXmlToJson(this.xml);
    this.declaration = this.initialJSON?.declaration;
  }

  parseXmlToJson(xml) {
    return JSON.parse(xmljs.xml2json(xml, null, 2));
  }

  static getStoredSuperdocVersion(docx) {
    try {
      const customXml = docx.find((doc) => doc.name === 'docProps/custom.xml');
      if (!customXml) return;

      const converter = new SuperConverter();
      const content = customXml.content;
      const contentJson = converter.parseXmlToJson(content);
      const properties = contentJson.elements.find((el) => el.name === 'Properties');
      if (!properties.elements) return;

      const superdocVersion = properties.elements.find((el) => el.name === 'property' && el.attributes.name === 'SuperdocVersion');
      if (!superdocVersion) return;
      
      const version = superdocVersion.elements[0].elements[0].elements[0].text;
      return version;
    } catch (e) {
      console.warn('Error getting Superdoc version', e);
      return;
    };
  }

  static updateDocumentVersion(docx = this.convertedXml, version = __APP_VERSION__) {
    const customLocation = 'docProps/custom.xml';
    if (!docx[customLocation]) {
      docx[customLocation] = generateCustomXml(__APP_VERSION__);
    }

    const customXml = docx['docProps/custom.xml'];
    if (!customXml) return;
  
    const properties = customXml.elements.find((el) => el.name === 'Properties');
    if (!properties.elements) properties.elements = [];

    const superdocVersion = properties.elements.find((el) => el.name === 'property' && el.attributes.name === 'SuperdocVersion');
    if (!superdocVersion) {
      const newCustomXml = generateSuperdocVersion();
      properties.elements.push(newCustomXml);
    } else {
      superdocVersion.elements[0].elements[0].elements[0].text = version;
    }

    return docx;
  }

  getDocumentDefaultStyles() {
    const styles = this.convertedXml['word/styles.xml'];
    if (!styles) return {};

    const defaults = styles.elements[0].elements.find((el) => el.name === 'w:docDefaults');

    // const pDefault = defaults.elements.find((el) => el.name === 'w:pPrDefault');

    // Get the run defaults for this document - this will include font, theme etc.
    const rDefault = defaults.elements.find((el) => el.name === 'w:rPrDefault');
    const rElements = rDefault.elements[0].elements;
    const rFonts = rElements?.find((el) => el.name === 'w:rFonts');
    if ('elements' in rDefault) {
      const fontThemeName = rElements.find((el) => el.name === 'w:rFonts')?.attributes['w:asciiTheme'];
      let typeface, panose;
      if (fontThemeName) {
        const fontInfo = this.getThemeInfo(fontThemeName);
        typeface = fontInfo.typeface;
        panose = fontInfo.panose;
      } else if (rFonts) {
        typeface = rFonts?.attributes['w:ascii'];
      } else {
        const paragraphDefaults =
          styles.elements[0].elements.filter((el) => {
            return el.name === 'w:style' && el.attributes['w:styleId'] === 'Normal';
          }) || [];
        paragraphDefaults.forEach((el) => {
          const rPr = el.elements.find((el) => el.name === 'w:rPr');
          const fonts = rPr?.elements?.find((el) => el.name === 'w:rFonts');
          typeface = fonts?.attributes['w:ascii'];
        });
      }

      const fontSizePt = Number(rElements.find((el) => el.name === 'w:sz')?.attributes['w:val']) / 2 || 12;
      const kern = rElements.find((el) => el.name === 'w:kern')?.attributes['w:val'];
      return { fontSizePt, kern, typeface, panose };
    }
  }
  
  getDocumentInternalId() {    
    const settingsLocation = 'word/settings.xml'
    if (!this.convertedXml[settingsLocation]) {
      this.convertedXml[settingsLocation] = SETTINGS_CUSTOM_XML;
    }

    const settings = Object.assign({}, this.convertedXml[settingsLocation]);
    if (!settings.elements[0]?.elements?.length) {
      const idElement = this.createDocumentIdElement(settings);
      
      settings.elements[0].elements = [
        idElement
      ];
      if (!settings.elements[0].attributes['xmlns:w15']) {
        settings.elements[0].attributes['xmlns:w15'] = 'http://schemas.microsoft.com/office/word/2012/wordml';
      }
      this.convertedXml[settingsLocation] = settings;
      return;
    }

    // New versions of Word will have w15:docId
    // It's possible to have w14:docId as well but Word(2013 and later) will convert it automatically when document opened
    const w15DocId = settings.elements[0].elements.find((el) => el.name === 'w15:docId');
    this.documentInternalId = w15DocId?.attributes['w15:val'];
  }

  createDocumentIdElement() {
    const docId = uuidv4().toUpperCase();
    this.documentInternalId = docId;
    
    return {
      type: 'element',
      name: 'w15:docId',
      attributes: {
        'w15:val': `{${docId}}`
      }
    }
  }

  getThemeInfo(themeName) {
    themeName = themeName.toLowerCase();
    const theme1 = this.convertedXml['word/theme/theme1.xml'];
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
    this.getDocumentInternalId();
    const result = createDocumentJson({...this.convertedXml, media: this.media }, this, editor);
  
    if (result) {
      this.savedTagsToRestore.push({ ...result.savedTagsToRestore });
      this.pageStyles = result.pageStyles;
      this.comments = result.comments;
      this.linkedStyles = result.linkedStyles;

      return result.pmDoc;
    } else {
      return null;
    }
  }

  schemaToXml(data) {
    const exporter = new DocxExporter(this);
    return exporter.schemaToXml(data);
  }

  async exportToDocx(
    jsonData,
    editorSchema,
    documentMedia,
    isFinalDoc = false,
    commentsExportType,
    comments = [],
  ) {
    const bodyNode = this.savedTagsToRestore.find((el) => el.name === 'w:body');
    const commentDefinitions = comments.map((c, index) => getCommentDefinition(c, index));

    const [result, params] = exportSchemaToJson({
      node: jsonData,
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
    });

    
    const exporter = new DocxExporter(this);
    const xml = exporter.schemaToXml(result);

    // Update media
    await this.#exportProcessMediaFiles({
      ...documentMedia,
      ...params.media,
      ...this.media,
    });

    // Update the rels table
    this.#exportProcessNewRelationships(params.relationships);

    // Update the comments.xml file
    this.#updateCommentsFiles(params.exportedCommentDefs, commentsExportType);
  
    // Store the SuperDoc version
    storeSuperdocVersion(this.convertedXml);
    
    return xml;
  }

  /**
   * Update the comments.xml file with the exported comments if necessary
   * 
   * @param {Array[Object]} exportedCommentDefs 
   * @param {String} commentsExportType 
   * @returns {void}
   */
  #updateCommentsFiles(exportedCommentDefs, commentsExportType) {
    const originalXml = this.convertedXml['word/comments.xml'];

    // If there were no original comments, and we're exporting a clean document, we don't need to do anything
    if (!originalXml && commentsExportType === 'clean') return;

    if (!this.convertedXml['word/comments.xml']) this.convertedXml['word/comments.xml'] = { ...COMMENTS_XML };
  
    // If we had previous comments, but exporting clean, we need to remove them
    const commentsXml = { ...this.convertedXml['word/comments.xml'] };
    if (commentsXml && commentsExportType === 'clean') {
      return this.convertedXml['word/comments.xml'] = { ...COMMENTS_XML };
    };

    const updatedCommentsXml = updateCommentsXml(exportedCommentDefs, commentsXml);
    this.convertedXml['word/comments.xml'] = updatedCommentsXml;
  }

  #exportProcessNewRelationships(rels = []) {
    const relsData = this.convertedXml['word/_rels/document.xml.rels'];
    const relationships = relsData.elements.find((x) => x.name === 'Relationships');
    relationships.elements.push(...rels);
    relationships.elements.forEach((element) => {
      element.attributes.Target = element.attributes?.Target?.replace(/&/g, '&amp;').replace(/-/g, '&#45;');
    });
    this.convertedXml['word/_rels/document.xml.rels'] = relsData;
  }

  async #exportProcessMediaFiles(media) {
    const processedData = {};
    for (const filePath in media) {
      if (typeof media[filePath] !== 'string') return;
      const name = filePath.split('/').pop();
      processedData[name] = await getArrayBufferFromUrl(media[filePath]);
    }

    this.convertedXml.media = {
      ...this.convertedXml.media,
      ...processedData,
    };
    this.media = this.convertedXml.media;
    this.addedMedia = processedData;
  }

}

function storeSuperdocVersion(docx) {
  const customLocation = 'docProps/custom.xml';
  if (!docx[customLocation]) {
    docx[customLocation] = generateCustomXml();
  };

  const customXml = docx[customLocation];
  const properties = customXml.elements.find((el) => el.name === 'Properties');
  if (!properties.elements) properties.elements = [];
  const elements = properties.elements;
  elements.push(generateSuperdocVersion());
  return docx;
};

function generateCustomXml() {
  return DEFAULT_CUSTOM_XML;
}

function generateSuperdocVersion(version = __APP_VERSION__) {
  return {
    type: "element",
    name: "property",
    attributes: {
      name: "SuperdocVersion",
      formatId: "{D5CDD505-2E9C-101B-9397-08002B2CF9AE}",
      pid: "2"
    },
    elements: [
      {
        type: "element",
        name: "vt:superdoc",
        elements: [
          {
            name: "w:t",
            elements: [{
              type: "text",
              text: version
            }],
          }
        ]
      }
    ]
  }
};

export { SuperConverter };
