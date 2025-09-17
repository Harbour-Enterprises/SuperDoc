export function inchesToTwips(inches: any): number;
export function twipsToInches(twips: any): number;
export function twipsToPixels(twips: any): number;
export function pixelsToTwips(pixels: any): number;
export function twipsToLines(twips: any): number;
export function linesToTwips(lines: any): number;
export function halfPointToPixels(halfPoints: any): number;
export function emuToPixels(emu: any): number;
export function pixelsToEmu(px: any): number;
export function pixelsToHalfPoints(pixels: any): number;
export function halfPointToPoints(halfPoints: any): number;
export function eigthPointsToPixels(eigthPoints: any): number;
export function pixelsToEightPoints(pixels: any): number;
export function getArrayBufferFromUrl(input: any, isHeadless: any): Promise<ArrayBuffer>;
export function getContentTypesFromXml(contentTypesXml: any): string[];
export function getHexColorFromDocxSystem(docxColor: any): string;
export function isValidHexColor(color: any): boolean;
export function rgbToHex(rgb: any): string;
export function ptToTwips(pt: any): number;
export function twipsToPt(twips: any): number;
export function getLineHeightValueString(lineHeight: any, defaultUnit: any, lineRule?: string, isObject?: boolean): string | {
    "line-height"?: undefined;
} | {
    "line-height": string;
};
export function deobfuscateFont(arrayBuffer: any, guidHex: any): any;
export function hasSomeParentWithClass(element: any, classname: any): any;
//# sourceMappingURL=helpers.d.ts.map