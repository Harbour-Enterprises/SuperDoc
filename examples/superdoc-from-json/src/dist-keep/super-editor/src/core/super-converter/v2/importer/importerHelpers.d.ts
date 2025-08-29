/**
 *
 * @param {XmlNode} node
 * @returns {{elements: *, attributes: {}, marks: *}}
 *
 */
export function parseProperties(node: XmlNode): {
    elements: any;
    attributes: {};
    marks: any;
};
/**
 *
 * @param {XmlNode} element
 * @returns {*}
 */
export function getElementName(element: XmlNode): any;
/**
 *
 * @param {XmlNode[]} elements
 * @returns {*}
 */
export function hasTextNode(elements: XmlNode[]): any;
export function isPropertiesElement(element: any): boolean;
