export function docxAsXmlFileList2ParsedDocx(docxAsXmlFileList: {
    name: string;
    content: string;
}[]): ParsedDocx;
export function parseXmlToJson(xml: any): any;
export function getInitialJSON(parsedDocx: ParsedDocx, fallbackXml?: string): any;
/**
 * this should have the `media` as a key for image handling
 */
export type ParsedDocx = {
    [x: string]: XmlNode;
};
