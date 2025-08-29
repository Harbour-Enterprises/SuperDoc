export function getDocumentRelationshipElements(editor: Editor): XmlRelationshipElement[];
export function getMaxRelationshipIdInt(relationships: XmlRelationshipElement[]): number;
export function findRelationshipIdFromTarget(target: string, editor: Editor): string | null;
export function insertNewRelationship(target: string, type: RelationshipType, editor: Editor): string | null;
export function getNewRelationshipId(editor: Editor): string;
export type Editor = import("../types.js").Editor;
export type XmlRelationshipElement = import("../types.js").XmlRelationshipElement;
export type RelationshipType = import("../types.js").RelationshipType;
