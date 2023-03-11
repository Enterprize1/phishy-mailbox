import {FormBuilder} from '@atmina/formbuilder';
import {RegisterOptions} from 'react-hook-form/dist/types/validator';
import {BrowserNativeObject, Primitive} from 'react-hook-form';
import {TextFieldProps} from '@mui/material';

export type FieldRules<T> = RegisterOptions<{__: T; b: T}, T extends Primitive | BrowserNativeObject ? '__' : '__'>;

export type FieldProps<T = string> = {
  label: string;
  on: FormBuilder<T>;
  className?: string;
  helperText?: string;
  rules?: FieldRules<T> | null;
  type?: string;
  monospace?: boolean;
  disabled?: boolean;
} & Pick<TextFieldProps, 'InputProps' | 'inputProps'>;

// RHF's `valueAsNumber` turns null into 0, but we don't want that.
// https://github.com/react-hook-form/react-hook-form/issues/6287
export const setValueAsNumber = (value: unknown) => {
  return value === '' || value === null ? null : Number(value);
};
