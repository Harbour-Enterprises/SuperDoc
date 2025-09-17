/**
 * @typedef {Object} ToolbarConfig
 * @property {string} [selector] - CSS selector for the toolbar container
 * @property {string[]} [toolbarGroups=['left', 'center', 'right']] - Groups to organize toolbar items
 * @property {string} [role='editor'] - Role of the toolbar ('editor' or 'viewer')
 * @property {boolean} [pagination=false] - Whether pagination is enabled
 * @property {Object} [icons] - Custom icons for toolbar items
 * @property {Object} [texts] - Custom texts for toolbar items
 * @property {string} [mode='docx'] - Editor mode
 * @property {string[]} [excludeItems=[]] - Items to exclude from the toolbar
 * @property {Object} [groups=null] - Custom groups configuration
 * @property {Object} [editor=null] - The editor instance
 * @property {string} [aiApiKey=null] - API key for AI integration
 * @property {string} [aiEndpoint=null] - Endpoint for AI integration
 * @property {ToolbarItem[]} [customButtons=[]] - Custom buttons to add to the toolbar
 */
/**
 * @typedef {Object} ToolbarItem
 * @property {Object} id - The unique ID of the toolbar item
 * @property {string} id.value - The value of the ID
 * @property {Object} name - The name of the toolbar item
 * @property {string} name.value - The value of the name
 * @property {string} type - The type of toolbar item (button, options, separator, dropdown, overflow)
 * @property {Object} group - The group the item belongs to
 * @property {string} group.value - The value of the group
 * @property {string} command - The command to execute
 * @property {string} [noArgumentCommand] - The command to execute when no argument is provided
 * @property {Object} icon - The icon for the item
 * @property {*} icon.value - The value of the icon
 * @property {Object} tooltip - The tooltip for the item
 * @property {*} tooltip.value - The value of the tooltip
 * @property {Object} attributes - Additional attributes for the item
 * @property {Object} attributes.value - The value of the attributes
 * @property {Object} disabled - Whether the item is disabled
 * @property {boolean} disabled.value - The value of disabled
 * @property {Object} active - Whether the item is active
 * @property {boolean} active.value - The value of active
 * @property {Object} expand - Whether the item is expanded
 * @property {boolean} expand.value - The value of expand
 * @property {Object} nestedOptions - Nested options for the item
 * @property {Array} nestedOptions.value - The array of nested options
 * @property {Object} style - Custom style for the item
 * @property {*} style.value - The value of the style
 * @property {Object} isNarrow - Whether the item has narrow styling
 * @property {boolean} isNarrow.value - The value of isNarrow
 * @property {Object} isWide - Whether the item has wide styling
 * @property {boolean} isWide.value - The value of isWide
 * @property {Object} minWidth - Minimum width of the item
 * @property {*} minWidth.value - The value of minWidth
 * @property {Object} argument - The argument to pass to the command
 * @property {*} argument.value - The value of the argument
 * @property {Object} parentItem - The parent of this item if nested
 * @property {*} parentItem.value - The value of parentItem
 * @property {Object} childItem - The child of this item if it has one
 * @property {*} childItem.value - The value of childItem
 * @property {Object} iconColor - The color of the icon
 * @property {*} iconColor.value - The value of iconColor
 * @property {Object} hasCaret - Whether the item has a dropdown caret
 * @property {boolean} hasCaret.value - The value of hasCaret
 * @property {Object} dropdownStyles - Custom styles for dropdown
 * @property {*} dropdownStyles.value - The value of dropdownStyles
 * @property {Object} tooltipVisible - Whether the tooltip is visible
 * @property {boolean} tooltipVisible.value - The value of tooltipVisible
 * @property {Object} tooltipTimeout - Timeout for the tooltip
 * @property {*} tooltipTimeout.value - The value of tooltipTimeout
 * @property {Object} defaultLabel - The default label for the item
 * @property {*} defaultLabel.value - The value of the default label
 * @property {Object} label - The label for the item
 * @property {*} label.value - The value of the label
 * @property {Object} hideLabel - Whether to hide the label
 * @property {boolean} hideLabel.value - The value of hideLabel
 * @property {Object} inlineTextInputVisible - Whether inline text input is visible
 * @property {boolean} inlineTextInputVisible.value - The value of inlineTextInputVisible
 * @property {Object} hasInlineTextInput - Whether the item has inline text input
 * @property {boolean} hasInlineTextInput.value - The value of hasInlineTextInput
 * @property {Object} markName - The name of the mark
 * @property {*} markName.value - The value of markName
 * @property {Object} labelAttr - The attribute for the label
 * @property {*} labelAttr.value - The value of labelAttr
 * @property {Object} allowWithoutEditor - Whether the item can be used without an editor
 * @property {boolean} allowWithoutEditor.value - The value of allowWithoutEditor
 * @property {Object} dropdownValueKey - The key for dropdown value
 * @property {*} dropdownValueKey.value - The value of dropdownValueKey
 * @property {Object} selectedValue - The selected value for the item
 * @property {*} selectedValue.value - The value of the selected value
 * @property {Object} inputRef - Reference to an input element
 * @property {*} inputRef.value - The value of inputRef
 * @property {Function} unref - Function to get unreferenced values
 * @property {Function} activate - Function to activate the item
 * @property {Function} deactivate - Function to deactivate the item
 * @property {Function} setDisabled - Function to set the disabled state
 * @property {Function} resetDisabled - Function to reset the disabled state
 * @property {Function} onActivate - Function called when the item is activated
 * @property {Function} onDeactivate - Function called when the item is deactivated
 */
/**
 * @typedef {Object} CommandItem
 * @property {ToolbarItem} item - The toolbar item
 * @property {*} [argument] - The argument to pass to the command
 */
/**
 * A customizable toolbar for the Super Editor
 * @class
 * @extends EventEmitter
 */
export class SuperToolbar extends EventEmitter<string | symbol, any> {
    /**
     * Creates a new SuperToolbar instance
     * @param {ToolbarConfig} config - The configuration for the toolbar
     * @returns {void}
     */
    constructor(config: ToolbarConfig);
    /**
     * Default configuration for the toolbar
     * @type {ToolbarConfig}
     */
    config: ToolbarConfig;
    toolbarItems: any[];
    overflowItems: any[];
    documentMode: any;
    isDev: any;
    superdoc: any;
    role: string;
    toolbarContainer: any;
    app: import("vue").App<Element>;
    toolbar: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}, {}, string, {}, {}, {}, string, import("vue").ComponentProvideOptions>, {}, {}, "", {}, any>;
    activeEditor: any;
    findElementBySelector(selector: any): any;
    /**
     * Log debug information to the console
     * @param {...*} args - Arguments to log
     * @returns {void}
     */
    log(...args: any[]): void;
    /**
     * Set the zoom level
     * @param {number} percent_int - The zoom percentage as an integer
     * @returns {void}
     */
    setZoom(percent_int: number): void;
    /**
     * The toolbar expects an active Super Editor instance.
     * @param {Object} editor - The editor instance to attach to the toolbar
     * @returns {void}
     */
    setActiveEditor(editor: any): void;
    /**
     * Get toolbar items by group name
     * @param {string} groupName - The name of the group
     * @returns {ToolbarItem[]} An array of toolbar items in the specified group
     */
    getToolbarItemByGroup(groupName: string): ToolbarItem[];
    /**
     * Get a toolbar item by name
     * @param {string} name - The name of the toolbar item
     * @returns {ToolbarItem|undefined} The toolbar item with the specified name or undefined if not found
     */
    getToolbarItemByName(name: string): ToolbarItem | undefined;
    /**
     * Update the toolbar state based on the current editor state
     * Updates active/inactive state of all toolbar items
     * @returns {void}
     */
    updateToolbarState(): void;
    /**
     * Handler for toolbar resize events
     * @returns {void}
     */
    onToolbarResize: () => void;
    undoDepth: any;
    redoDepth: any;
    /**
     * React to editor transactions. Might want to debounce this.
     * @param {Object} params - Transaction parameters
     * @param {Object} params.editor - The editor instance (not used)
     * @param {Object} params.transaction - The transaction object
     * @returns {void}
     */
    onEditorTransaction({ editor, transaction }: {
        editor: any;
        transaction: any;
    }): void;
    /**
     * Main handler for toolbar commands
     * @param {CommandItem} params - Command parameters
     * @param {ToolbarItem} params.item - An instance of the useToolbarItem composable
     * @param {*} [params.argument] - The argument passed to the command
     * @returns {*} The result of the executed command, undefined if no result is returned
     */
    emitCommand({ item, argument, option }: CommandItem): any;
    #private;
}
export type ToolbarConfig = {
    /**
     * - CSS selector for the toolbar container
     */
    selector?: string;
    /**
     * - Groups to organize toolbar items
     */
    toolbarGroups?: string[];
    /**
     * - Role of the toolbar ('editor' or 'viewer')
     */
    role?: string;
    /**
     * - Whether pagination is enabled
     */
    pagination?: boolean;
    /**
     * - Custom icons for toolbar items
     */
    icons?: any;
    /**
     * - Custom texts for toolbar items
     */
    texts?: any;
    /**
     * - Editor mode
     */
    mode?: string;
    /**
     * - Items to exclude from the toolbar
     */
    excludeItems?: string[];
    /**
     * - Custom groups configuration
     */
    groups?: any;
    /**
     * - The editor instance
     */
    editor?: any;
    /**
     * - API key for AI integration
     */
    aiApiKey?: string;
    /**
     * - Endpoint for AI integration
     */
    aiEndpoint?: string;
    /**
     * - Custom buttons to add to the toolbar
     */
    customButtons?: ToolbarItem[];
};
export type ToolbarItem = {
    /**
     * - The unique ID of the toolbar item
     */
    id: {
        value: string;
    };
    /**
     * - The name of the toolbar item
     */
    name: {
        value: string;
    };
    /**
     * - The type of toolbar item (button, options, separator, dropdown, overflow)
     */
    type: string;
    /**
     * - The group the item belongs to
     */
    group: {
        value: string;
    };
    /**
     * - The command to execute
     */
    command: string;
    /**
     * - The command to execute when no argument is provided
     */
    noArgumentCommand?: string;
    /**
     * - The icon for the item
     */
    icon: {
        value: any;
    };
    /**
     * - The tooltip for the item
     */
    tooltip: {
        value: any;
    };
    /**
     * - Additional attributes for the item
     */
    attributes: {
        value: any;
    };
    /**
     * - Whether the item is disabled
     */
    disabled: {
        value: boolean;
    };
    /**
     * - Whether the item is active
     */
    active: {
        value: boolean;
    };
    /**
     * - Whether the item is expanded
     */
    expand: {
        value: boolean;
    };
    /**
     * - Nested options for the item
     */
    nestedOptions: {
        value: any[];
    };
    /**
     * - Custom style for the item
     */
    style: {
        value: any;
    };
    /**
     * - Whether the item has narrow styling
     */
    isNarrow: {
        value: boolean;
    };
    /**
     * - Whether the item has wide styling
     */
    isWide: {
        value: boolean;
    };
    /**
     * - Minimum width of the item
     */
    minWidth: {
        value: any;
    };
    /**
     * - The argument to pass to the command
     */
    argument: {
        value: any;
    };
    /**
     * - The parent of this item if nested
     */
    parentItem: {
        value: any;
    };
    /**
     * - The child of this item if it has one
     */
    childItem: {
        value: any;
    };
    /**
     * - The color of the icon
     */
    iconColor: {
        value: any;
    };
    /**
     * - Whether the item has a dropdown caret
     */
    hasCaret: {
        value: boolean;
    };
    /**
     * - Custom styles for dropdown
     */
    dropdownStyles: {
        value: any;
    };
    /**
     * - Whether the tooltip is visible
     */
    tooltipVisible: {
        value: boolean;
    };
    /**
     * - Timeout for the tooltip
     */
    tooltipTimeout: {
        value: any;
    };
    /**
     * - The default label for the item
     */
    defaultLabel: {
        value: any;
    };
    /**
     * - The label for the item
     */
    label: {
        value: any;
    };
    /**
     * - Whether to hide the label
     */
    hideLabel: {
        value: boolean;
    };
    /**
     * - Whether inline text input is visible
     */
    inlineTextInputVisible: {
        value: boolean;
    };
    /**
     * - Whether the item has inline text input
     */
    hasInlineTextInput: {
        value: boolean;
    };
    /**
     * - The name of the mark
     */
    markName: {
        value: any;
    };
    /**
     * - The attribute for the label
     */
    labelAttr: {
        value: any;
    };
    /**
     * - Whether the item can be used without an editor
     */
    allowWithoutEditor: {
        value: boolean;
    };
    /**
     * - The key for dropdown value
     */
    dropdownValueKey: {
        value: any;
    };
    /**
     * - The selected value for the item
     */
    selectedValue: {
        value: any;
    };
    /**
     * - Reference to an input element
     */
    inputRef: {
        value: any;
    };
    /**
     * - Function to get unreferenced values
     */
    unref: Function;
    /**
     * - Function to activate the item
     */
    activate: Function;
    /**
     * - Function to deactivate the item
     */
    deactivate: Function;
    /**
     * - Function to set the disabled state
     */
    setDisabled: Function;
    /**
     * - Function to reset the disabled state
     */
    resetDisabled: Function;
    /**
     * - Function called when the item is activated
     */
    onActivate: Function;
    /**
     * - Function called when the item is deactivated
     */
    onDeactivate: Function;
};
export type CommandItem = {
    /**
     * - The toolbar item
     */
    item: ToolbarItem;
    /**
     * - The argument to pass to the command
     */
    argument?: any;
};
import { EventEmitter } from 'eventemitter3';
//# sourceMappingURL=super-toolbar.d.ts.map