import { ref, type Ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';

type ToolbarItemType = 'button' | 'options' | 'separator' | 'dropdown' | 'overflow';

export interface ToolbarItemOptions {
  type: ToolbarItemType;
  name: string;
  command?: string;
  noArgumentCommand?: boolean;
  icon?: string;
  group?: string;
  allowWithoutEditor?: boolean;
  attributes?: Record<string, unknown>;
  disabled?: boolean;
  style?: Record<string, unknown>;
  isNarrow?: boolean;
  isWide?: boolean;
  minWidth?: string;
  suppressActiveHighlight?: boolean;
  argument?: unknown;
  iconColor?: string;
  hasCaret?: boolean;
  dropdownStyles?: Record<string, unknown>;
  tooltip?: string;
  tooltipVisible?: boolean;
  tooltipTimeout?: number;
  defaultLabel?: string;
  label?: string;
  hideLabel?: boolean;
  inlineTextInputVisible?: boolean;
  hasInlineTextInput?: boolean;
  markName?: string;
  labelAttr?: string;
  selectedValue?: string;
  dropdownValueKey?: string;
  inputRef?: HTMLInputElement | null;
  options?: unknown[];
  onActivate?: (attrs?: Record<string, unknown>, ...args: unknown[]) => void;
  onDeactivate?: () => void;
}

export interface ToolbarItem {
  id: Ref<string>;
  name: Ref<string>;
  type: ToolbarItemType;
  command?: string;
  noArgumentCommand?: boolean;
  icon: Ref<string | undefined>;
  tooltip: Ref<string | undefined>;
  group: Ref<string>;
  attributes: Ref<Record<string, unknown>>;
  disabled: Ref<boolean | undefined>;
  active: Ref<boolean>;
  expand: Ref<boolean>;
  nestedOptions: Ref<unknown[]>;
  style: Ref<Record<string, unknown> | undefined>;
  isNarrow: Ref<boolean | undefined>;
  isWide: Ref<boolean | undefined>;
  minWidth: Ref<string | undefined>;
  argument: Ref<unknown>;
  parentItem: Ref<ToolbarItem | undefined>;
  iconColor: Ref<string | undefined>;
  hasCaret: Ref<boolean | undefined>;
  dropdownStyles: Ref<Record<string, unknown> | undefined>;
  tooltipVisible: Ref<boolean | undefined>;
  tooltipTimeout: Ref<number | undefined>;
  defaultLabel: Ref<string | undefined>;
  label: Ref<string | undefined>;
  hideLabel: Ref<boolean | undefined>;
  inlineTextInputVisible: Ref<boolean | undefined>;
  hasInlineTextInput: Ref<boolean | undefined>;
  markName: Ref<string | undefined>;
  labelAttr: Ref<string | undefined>;
  childItem: Ref<ToolbarItem | undefined>;
  allowWithoutEditor: Ref<boolean | undefined>;
  dropdownValueKey: Ref<string | undefined>;
  selectedValue: Ref<string | undefined>;
  inputRef: Ref<HTMLInputElement | null>;
  unref: () => Record<string, unknown>;
  activate: (attrs?: Record<string, unknown>, ...args: unknown[]) => void;
  deactivate: () => void;
  setDisabled: (state: boolean) => void;
  resetDisabled: () => void;
  onActivate: (attrs?: Record<string, unknown>, ...args: unknown[]) => void;
  onDeactivate: () => void;
}

export const useToolbarItem = (options: ToolbarItemOptions): ToolbarItem => {
  const types: ToolbarItemType[] = ['button', 'options', 'separator', 'dropdown', 'overflow'];
  if (!types.includes(options.type)) {
    throw new Error('Invalid toolbar item type - ' + options.type);
  }

  if (options.type === 'button' && !options.defaultLabel && !options.icon) {
    throw new Error('Toolbar button item needs either icon or label - ' + options.name);
  }

  if (!options.name) {
    throw new Error('Invalid toolbar item name - ' + options.name);
  }

  const id = ref(uuidv4());
  const type = options.type;
  const name = ref(options.name);
  const command = options.command;
  const noArgumentCommand = options.noArgumentCommand;
  const icon = ref(options.icon);
  const group = ref(options.group || 'center');
  const allowWithoutEditor = ref(options.allowWithoutEditor);
  const attributes = ref(options.attributes || {});

  const initiallyDisabled = options.disabled || false;
  const disabled = ref(options.disabled);
  const active = ref(false);
  const expand = ref(false);

  // top-level style
  const style = ref(options.style);
  const isNarrow = ref(options.isNarrow);
  const isWide = ref(options.isWide);
  const minWidth = ref(options.minWidth);
  const suppressActiveHighlight = ref(options.suppressActiveHighlight || false);

  const argument = ref(options.argument);
  const childItem = ref(null);
  const parentItem = ref(null);

  // icon properties
  const iconColor = ref(options.iconColor);
  const hasCaret = ref(options.hasCaret);

  // dropdown properties
  const dropdownStyles = ref(options.dropdownStyles);

  // tooltip properties
  const tooltip = ref(options.tooltip);
  const tooltipVisible = ref(options.tooltipVisible);
  const tooltipTimeout = ref(options.tooltipTimeout);

  // behavior
  const defaultLabel = ref(options.defaultLabel);
  const label = ref(options.label);
  const hideLabel = ref(options.hideLabel);
  const inlineTextInputVisible = ref(options.inlineTextInputVisible);
  const hasInlineTextInput = ref(options.hasInlineTextInput);

  const markName = ref(options.markName);
  const labelAttr = ref(options.labelAttr);

  // Dropdown item
  const selectedValue = ref(options.selectedValue);
  const dropdownValueKey = ref(options.dropdownValueKey);

  const inputRef = ref(options.inputRef || null);

  const nestedOptions = ref<unknown[]>([]);
  if (options.options) {
    if (!Array.isArray(options.options)) throw new Error('Invalid toolbar item options - ' + options.options);
    nestedOptions.value?.push(...options.options);
  }

  // Activation & Deactivation
  const activate = (attrs: Record<string, unknown> = {}, ...args: unknown[]): void => {
    onActivate(attrs, ...args);

    if (suppressActiveHighlight.value) return;
    active.value = true;
  };

  const deactivate = (): void => {
    onDeactivate();
    active.value = false;
  };

  const setDisabled = (state: boolean): void => {
    disabled.value = state;
  };

  const resetDisabled = (): void => {
    disabled.value = initiallyDisabled;
  };

  // User can override this behavior
  const onActivate =
    options.onActivate ||
    ((): void => {
      /* noop */
    });
  const onDeactivate =
    options.onDeactivate ||
    ((): void => {
      /* noop */
    });

  const unref = (): Record<string, unknown> => {
    const flattened: Record<string, unknown> = {};
    Object.keys(refs).forEach((key) => {
      const refValue = (refs as Record<string, Ref<unknown>>)[key];
      if (refValue.value !== undefined) {
        flattened[key] = refValue.value;
      }
    });
    return flattened;
  };

  const refs = {
    id,
    name,
    type,
    command,
    noArgumentCommand,
    icon,
    tooltip,
    group,
    attributes,
    disabled,
    active,
    expand,
    nestedOptions,

    style,
    isNarrow,
    isWide,
    minWidth,
    argument,
    parentItem,
    iconColor,
    hasCaret,
    dropdownStyles,
    tooltipVisible,
    tooltipTimeout,
    defaultLabel,
    label,
    hideLabel,
    inlineTextInputVisible,
    hasInlineTextInput,
    markName,
    labelAttr,
    childItem,

    allowWithoutEditor,
    dropdownValueKey,
    selectedValue,
    inputRef,
  };

  return {
    ...refs,
    unref,
    activate,
    deactivate,
    setDisabled,
    resetDisabled,
    onActivate,
    onDeactivate,
  };
};
