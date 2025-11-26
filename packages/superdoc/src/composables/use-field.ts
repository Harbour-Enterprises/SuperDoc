import { ref, reactive, watch, type Ref, type UnwrapNestedRefs } from 'vue';

/**
 * Font style configuration for a field
 */
export interface FieldStyle {
  /** Font family for the field */
  fontFamily: string;
  /** Font size for the field */
  fontSize: string;
  /** Original font size for the field */
  originalFontSize: string;
}

/**
 * Option item for select and checkbox fields
 */
export interface FieldOption {
  /** Display label for the option */
  itemdisplaylabel?: string;
  /** Value of the option */
  itemlinkvalue?: string | boolean;
  /** Whether the option is checked (for checkboxes) */
  ischecked?: boolean;
  /** ID of the option */
  itemid?: string;
  /** ID of the associated annotation */
  annotationId?: string;
}

/**
 * Normalized checkbox option
 */
export interface CheckboxOption {
  /** Display label for the option */
  label: string;
  /** Value of the option */
  value: string | boolean;
  /** Whether the option is checked */
  checked: boolean;
  /** ID of the option */
  id: string;
  /** ID of the associated annotation */
  annotationId?: string;
}

/**
 * Logic rules for conditional field visibility
 */
export interface LogicRules {
  [key: string]: unknown;
}

/**
 * Raw field data structure from the API
 */
export interface RawField {
  /** Unique identifier for the field */
  itemid: string;
  /** Icon identifier for the field */
  itemicon?: string;
  /** Icon pack identifier */
  itemiconpack?: string;
  /** Display label for the field */
  itemdisplaylabel?: string;
  /** Initial value of the field */
  itemlinkvalue?: unknown;
  /** Placeholder text for the field */
  itemplaceholdertext?: string;
  /** Type of the field (SELECT, IMAGEINPUT, CHECKBOXINPUT, etc.) */
  itemtype?: string;
  /** Subtype of the field */
  itemfieldtype?: string;
  /** Font family for the field */
  fontfamily?: string;
  /** Font size for the field */
  font_size?: string;
  /** Original font size for the field */
  original_font_size?: string;
  /** Logic rules for conditional visibility */
  logicrules?: LogicRules;
  /** Format string for the field value */
  itemformat?: string;
  /** Options for select/checkbox fields */
  itemoptions?: FieldOption[];
  /** Input type for image fields */
  iteminputtype?: string;
  /** Custom value getter function */
  valueGetter?: (data: unknown) => string;
}

/**
 * Change record for tracking field value changes
 */
export interface FieldChange {
  /** ID of the field that changed */
  fieldId: string;
  /** Timestamp of the change */
  changeTime: number;
  /** Previous value before the change */
  oldValue: unknown;
  /** New value after the change */
  newValue: unknown;
  /** Reference to the original field object */
  originalField: RawField;
}

/**
 * Return type of the useFieldValueWatcher composable
 */
export interface UseFieldValueWatcherReturn<T = unknown> {
  /** Reactive reference to the field value */
  value: T extends object ? UnwrapNestedRefs<T> : Ref<T>;
}

/**
 * Additional options returned for select fields
 */
export interface SelectFieldOptions {
  /** Available options for the select field */
  options: Ref<FieldOption[] | undefined>;
}

/**
 * Additional options returned for checkbox fields
 */
export interface CheckboxFieldOptions {
  /** Available options for the checkbox field */
  options: Ref<CheckboxOption[] | undefined>;
}

/**
 * Additional options returned for image fields
 */
export interface ImageFieldOptions {
  /** Font family for the image field */
  fontfamily: Ref<string | undefined>;
  /** Input type for the image field */
  iteminputtype: Ref<string | undefined>;
}

/**
 * Return type of the useField composable
 */
export type UseFieldReturn = {
  /** Unique identifier for the field */
  id: Ref<string>;
  /** Icon identifier */
  icon: Ref<string | undefined>;
  /** Icon pack identifier */
  iconPack: Ref<string | undefined>;
  /** Display label */
  label: Ref<string | undefined>;
  /** Placeholder text */
  placeholder: string | undefined;
  /** Field type */
  fieldType: Ref<string | undefined>;
  /** Field subtype */
  fieldSubType: Ref<string | undefined>;
  /** Current field value */
  value: Ref<unknown> | UnwrapNestedRefs<Record<string, unknown>>;
  /** Format string */
  format: Ref<string | undefined>;
  /** Logic rules */
  logicRules: Ref<LogicRules | undefined>;
  /** Whether the field is hidden */
  hidden: Ref<boolean>;
  /** Original JSON data */
  originalJSON: RawField;
  /** Field styling */
  fieldStyle: UnwrapNestedRefs<FieldStyle>;
  /** Custom value getter function */
  valueGetter?: (data: unknown) => string;
} & Record<string, unknown>;

/**
 * Vue composable for watching field value changes
 *
 * This composable creates a reactive value wrapper around a field's initial value
 * and watches for changes, tracking them with timestamps and old/new values.
 *
 * @param field - The raw field object
 * @param originalValue - The initial value of the field
 * @returns An object containing the reactive value
 */
export function useFieldValueWatcher<T = unknown>(field: RawField, originalValue: T): UseFieldValueWatcherReturn<T> {
  const fieldId = field.itemid;
  const rawField = field;

  const valueIsObject = originalValue !== null && typeof originalValue === 'object';
  const value = valueIsObject ? reactive({ ...(originalValue as object) }) : ref(originalValue);
  const change = ref<FieldChange | null>(null);

  const handleChange = (newValue: T, oldValue: T): void => {
    // If the value hasn't changed, don't do anything
    // If new change, add the change to the list
    const newChange: FieldChange = {
      fieldId: fieldId,
      changeTime: Date.now(),
      oldValue: oldValue,
      newValue: newValue,
      originalField: rawField,
    };
    change.value = newChange;
  };

  watch(value as Ref<T>, handleChange);
  return {
    value: value as T extends object ? UnwrapNestedRefs<T> : Ref<T>,
  };
}

/**
 * Vue composable for managing field state and behavior
 *
 * This composable provides comprehensive field management including:
 * - Reactive state for all field properties
 * - Value change tracking
 * - Type-specific field handlers (select, checkbox, image)
 * - Field styling and formatting
 * - Logic rules for conditional visibility
 *
 * @param field - The raw field object from the API
 * @returns Field state and properties
 *
 * @example
 * const field = useField(rawFieldData);
 * console.log(field.label.value);
 * field.value.value = 'new value';
 */
export function useField(field: RawField): UseFieldReturn {
  const id = ref<string>(field.itemid);

  const icon = ref<string | undefined>(field.itemicon);
  const iconPack = ref<string | undefined>(field.itemiconpack);

  const label = ref<string | undefined>(field.itemdisplaylabel);
  const originalValue = field.itemlinkvalue;
  const placeholder = field.itemplaceholdertext;

  const { value } = useFieldValueWatcher(field, originalValue);

  const fieldType = ref<string | undefined>(field.itemtype);
  const fieldSubType = ref<string | undefined>(field.itemfieldtype);
  const originalJSON = field;
  const fieldStyle = reactive<FieldStyle>({
    fontFamily: field.fontfamily || 'Arial',
    fontSize: field.font_size || '12pt',
    originalFontSize: field.original_font_size || '12pt',
  });

  const logicRules = ref<LogicRules | undefined>(field.logicrules);
  const hidden = ref<boolean>(false);

  const additionalOptions: Record<string, unknown> = reactive({});
  const fieldHandlers: Record<string, (f: RawField) => SelectFieldOptions | ImageFieldOptions | CheckboxFieldOptions> =
    {
      SELECT: useSelectField,
      IMAGEINPUT: useImageField,
      CHECKBOXINPUT: useCheckboxField,
    };
  if (fieldType.value && fieldType.value in fieldHandlers) {
    Object.assign(additionalOptions, fieldHandlers[fieldType.value](field));
  }

  const format = ref<string | undefined>(field.itemformat);

  /**
   * Callback for fields which value is not a String value
   * and have to be calculated using additional data
   * Example: multiple image upload input
   *
   * @param data - Data which is passed from SD
   * @returns String value that can be used in annotation
   */
  const valueGetter = field.valueGetter;

  return {
    id,
    icon,
    iconPack,
    label,
    placeholder,
    fieldType,
    fieldSubType,
    value,
    format,
    logicRules,
    hidden,
    originalJSON,
    fieldStyle,
    valueGetter,
    ...additionalOptions,
  };
}

/**
 * Handler for image input fields
 *
 * @param field - The raw field object
 * @returns Image field specific options
 */
export function useImageField(field: RawField): ImageFieldOptions {
  const fontfamily = ref<string | undefined>(field.fontfamily);
  const iteminputtype = ref<string | undefined>(field.iteminputtype);

  const self: ImageFieldOptions = {
    fontfamily,
    iteminputtype,
  };
  return self;
}

/**
 * Handler for select fields
 *
 * @param field - The raw field object
 * @returns Select field specific options
 */
export function useSelectField(field: RawField): SelectFieldOptions {
  const options = ref<FieldOption[] | undefined>(field.itemoptions);
  return {
    options,
  };
}

/**
 * Handler for checkbox fields
 *
 * @param field - The raw field object
 * @returns Checkbox field specific options
 */
export function useCheckboxField(field: RawField): CheckboxFieldOptions {
  const options = ref<CheckboxOption[] | undefined>(undefined);

  if (field.itemoptions) {
    options.value = field.itemoptions.map((option: FieldOption): CheckboxOption => {
      return {
        label: option.itemdisplaylabel || '',
        value: option.itemlinkvalue ?? false,
        checked: option.ischecked || false,
        id: option.itemid || '',
        annotationId: option.annotationId,
      };
    });
  }
  return {
    options,
  };
}
