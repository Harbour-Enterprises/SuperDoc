export function makeDefaultItems({ superToolbar, toolbarIcons, toolbarTexts, toolbarFonts, hideButtons, availableWidth, role, isDev, }?: {
    isDev?: boolean;
}): {
    defaultItems: any[];
    overflowItems: any[];
};
export function setHistoryButtonStateOnUpdate(toolbarItemsRef: any): ({ editor }: {
    editor: any;
}) => void;
