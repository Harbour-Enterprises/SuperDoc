export type FieldType = 'text' | 'checkbox' | 'image' | 'html' | 'link' | 'signature';

// NOTE: verify what attrs are required and what are optional
// To avoid using Partial<FieldAttributes>
export interface FieldAttributes {
  fieldId: string;
  displayLabel: string;
  defaultDisplayLabel?: string;
  hash?: string;
  type?: FieldType;
  fieldColor?: string;
  hidden?: boolean;
}

export interface FieldValue {
  input_id: string;
  input_value: string | boolean;
}