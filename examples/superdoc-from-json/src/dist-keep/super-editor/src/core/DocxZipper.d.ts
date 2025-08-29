export default DocxZipper;
/**
 * Class to handle unzipping and zipping of docx files
 */
declare class DocxZipper {
    constructor(params?: {});
    debug: any;
    zip: any;
    files: any[];
    media: {};
    mediaFiles: {};
    fonts: {};
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
    getDocxData(file: any, isNode?: boolean): Promise<any[]>;
    getFileExtension(fileName: any): any;
    /**
     * Update [Content_Types].xml with extensions of new Image annotations
     */
    updateContentTypes(docx: any, media: any, fromJson: any): Promise<any>;
    unzip(file: any): Promise<any>;
    updateZip({ docx, updatedDocs, originalDocxFile, media, fonts, isHeadless }: {
        docx: any;
        updatedDocs: any;
        originalDocxFile: any;
        media: any;
        fonts: any;
        isHeadless: any;
    }): Promise<any>;
    /**
     * Export the Editor content to a docx file, updating changed docs
     * @param {Object} docx An object containing the unzipped docx files (keys are relative file names)
     * @param {Object} updatedDocs An object containing the updated docs (keys are relative file names)
     * @returns {Promise<JSZip>} The unzipped but updated docx file ready for zipping
     */
    exportFromCollaborativeDocx(docx: any, updatedDocs: any, media: any, fonts: any): Promise<JSZip>;
    /**
     * Export the Editor content to a docx file, updating changed docs
     * Requires the original docx file
     * @param {File} originalDocxFile The original docx file
     * @param {Object} updatedDocs An object containing the updated docs (keys are relative file names)
     * @returns {Promise<JSZip>} The unzipped but updated docx file ready for zipping
     */
    exportFromOriginalFile(originalDocxFile: File, updatedDocs: any, media: any): Promise<JSZip>;
}
