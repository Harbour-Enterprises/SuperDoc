export const commands: {
    cleanUpParagraphWithAnnotations: (fieldsToDelete?: string[]) => Function;
    cleanUpListsWithAnnotations: (fieldsToDelete?: string[]) => Function;
};
export * from "./cleanUpListsWithAnnotations.js";
export * from "./cleanUpParagraphWithAnnotations.js";
