export class SuperConverter {
    static allowedElements: Readonly<{
        'w:document': "doc";
        'w:body': "body";
        'w:p': "paragraph";
        'w:r': "run";
        'w:t': "text";
        'w:delText': "text";
        'w:br': "lineBreak";
        'w:tbl': "table";
        'w:tr': "tableRow";
        'w:tc': "tableCell";
        'w:drawing': "drawing";
        'w:bookmarkStart': "bookmarkStart";
        'w:sectPr': "sectionProperties";
        'w:rPr': "runProperties";
        'w:commentRangeStart': "commentRangeStart";
        'w:commentRangeEnd': "commentRangeEnd";
        'w:commentReference': "commentReference";
    }>;
    static markTypes: ({
        name: string;
        type: string;
        property: string;
        mark?: undefined;
    } | {
        name: string;
        type: string;
        property?: undefined;
        mark?: undefined;
    } | {
        name: string;
        type: string;
        mark: string;
        property: string;
    } | {
        name: string;
        type: string;
        mark: string;
        property?: undefined;
    })[];
    static propertyTypes: Readonly<{
        'w:pPr': "paragraphProperties";
        'w:rPr': "runProperties";
        'w:sectPr': "sectionProperties";
        'w:numPr': "numberingProperties";
        'w:tcPr': "tableCellProperties";
    }>;
    static elements: Set<string>;
    static getStoredSuperdocVersion(docx: any): any;
    static updateDocumentVersion(docx?: any, version?: any): any;
    constructor(params?: any);
    debug: any;
    declaration: any;
    documentAttributes: any;
    convertedXml: {};
    docx: any;
    media: any;
    fonts: any;
    addedMedia: {};
    comments: any[];
    docHiglightColors: Set<any>;
    xml: any;
    numbering: {};
    pageStyles: any;
    initialJSON: any;
    headers: {};
    headerIds: {
        default: any;
        even: any;
        odd: any;
        first: any;
    };
    headerEditors: any[];
    footers: {};
    footerIds: {
        default: any;
        even: any;
        odd: any;
        first: any;
    };
    footerEditors: any[];
    linkedStyles: any[];
    json: any;
    tagsNotInSchema: string[];
    savedTagsToRestore: any[];
    telemetry: any;
    documentInternalId: any;
    fileSource: any;
    documentId: any;
    /**
     * Get the DocxHelpers object that contains utility functions for working with docx files.
     * @returns {import('./docx-helpers/docx-helpers.js').DocxHelpers} The DocxHelpers object.
     */
    get docxHelpers(): any;
    parseFromXml(): void;
    parseXmlToJson(xml: any): any;
    getDocumentDefaultStyles(): {
        fontSizePt?: undefined;
        kern?: undefined;
        typeface?: undefined;
        panose?: undefined;
    } | {
        fontSizePt: number;
        kern: any;
        typeface: any;
        panose: any;
    };
    getDocumentFonts(): string;
    getDocumentInternalId(): void;
    createDocumentIdElement(): {
        type: string;
        name: string;
        attributes: {
            'w15:val': string;
        };
    };
    getThemeInfo(themeName: any): {
        typeface?: undefined;
        panose?: undefined;
    } | {
        typeface: any;
        panose: any;
    };
    getSchema(editor: any): import("./v2/importer/docxImporter.js").PmNodeJson;
    schemaToXml(data: any, debug?: boolean): any;
    exportToDocx(jsonData: any, editorSchema: any, documentMedia: any, isFinalDoc: boolean, commentsExportType: any, comments: any[], editor: any, exportJsonOnly?: boolean): Promise<any>;
    exportToXmlJson({ data, editorSchema, comments, commentDefinitions, commentsExportType, isFinalDoc, editor, isHeaderFooter, }: {
        data: any;
        editorSchema: any;
        comments: any;
        commentDefinitions: any;
        commentsExportType?: string;
        isFinalDoc?: boolean;
        editor: any;
        isHeaderFooter?: boolean;
    }): {
        result: any;
        params: any;
    };
    #private;
}
//# sourceMappingURL=SuperConverter.d.ts.map