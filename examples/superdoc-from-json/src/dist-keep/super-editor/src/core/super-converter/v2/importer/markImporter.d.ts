/**
 *
 * @param property
 * @returns {PmMarkJson[]}
 */
export function parseMarks(property: any, unknownMarks?: any[], docx?: any): PmMarkJson[];
/**
 *
 * @param {XmlNode} rPr
 * @param {PmMarkJson[]} currentMarks
 * @returns {PmMarkJson[]} a trackMarksMark, or an empty array
 */
export function handleStyleChangeMarks(rPr: XmlNode, currentMarks: PmMarkJson[]): PmMarkJson[];
/**
 *
 * @param {PmMarkJson[]} marks
 * @returns {PmMarkJson[]}
 */
export function createImportMarks(marks: PmMarkJson[]): PmMarkJson[];
