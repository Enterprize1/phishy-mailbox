import {FormBuilder} from '@atmina/formbuilder';
import useFocusWithin from '../../lib/hooks/use-focus-within';
import {SxProps, TextFieldProps, Theme} from '@mui/material';
import {FocusEventHandler, RefCallback, useRef, useState} from 'react';
import mergeRefs from '../../utils/mergeRefs';
import useFieldEnhancements from './useFieldEnhancements';
import {FieldRules} from './fields/common';

// Known bugs:
// - React Warning: Can't perform a React state update on an unmounted component
//   triggered by useEffect / unmount of controlled input components

interface UseInputFieldOptions<T> {
  className?: string;
  on: FormBuilder<T>;
  rules?: FieldRules<T> | null;
  readOnly?: boolean;
  monospace?: boolean;
  label?: string;
  disabled?: boolean;
  inputProps?: TextFieldProps['inputProps'];
  InputProps?: TextFieldProps['InputProps'];
}

const isFilled = (value: unknown) => {
  if (value === '') return false;
  if (value == null) return false;
  return !Number.isNaN(value);
};

type UseInputFieldResult<T> = {
  textFieldProps: Required<Pick<TextFieldProps, 'name' | 'inputProps' | 'variant'>> & {
    error?: boolean;
    helperText?: TextFieldProps['helperText'];
    required?: boolean;
    sx?: SxProps<Theme>;
    onFocus?: FocusEventHandler<HTMLElement>;
    onBlur?: FocusEventHandler<HTMLElement>;
    onChange: (event: {target: {name: string; value: unknown}}) => void;
    inputRef: RefCallback<HTMLInputElement>;
    InputLabelProps?: TextFieldProps['InputLabelProps'];
  };
  name: string;
  value: T;
};

function useCommonInputFieldProps<T>(options: UseInputFieldOptions<T>) {
  const {on, readOnly, monospace, rules, label, disabled, inputProps, InputProps} = options;
  const name = String(on);
  const {errorText} = useFieldEnhancements({on});

  const result: Required<Pick<TextFieldProps, 'inputProps' | 'InputProps' | 'name' | 'variant' | 'sx'>> &
    Pick<TextFieldProps, 'label' | 'error' | 'helperText' | 'disabled'> = {
    inputProps: {...inputProps},
    InputProps: {...InputProps},
    sx: {my: 1},
    name,
    variant: 'outlined',
    label,
  };

  if (monospace) {
    result.inputProps['data-monospace'] = true;
  }

  if (readOnly) {
    result.InputProps.readOnly = true;
  }

  if (rules?.required) {
    result.InputProps.required = true;
  }

  if (errorText) {
    result.error = true;
    result.helperText = errorText;
  }

  if (disabled) {
    result.disabled = true;
  }

  if (typeof rules?.min === 'number') {
    result.inputProps.min = rules?.min;
  }

  if (typeof rules?.max === 'number') {
    result.inputProps.max = rules?.max;
  }

  return result;
}

/*
 * Handles common input field behavior implemented on uncontrolled MUI
 * TextFields.
 *
 * The reason this is a hook and not a base component is that the various
 * input fields are constructed in different ways that benefit from the added
 * flexibility that hooks provide. For example, building MaskedInputField on
 * top of InputField would be a lot more cumbersome.
 */
export function useInputField<T>(options: UseInputFieldOptions<T>): UseInputFieldResult<T> {
  const {on, rules, readOnly, monospace, inputProps, InputProps, ...rest} = options;
  const {inputProps: commonInputProps, ...otherCommonProps} = useCommonInputFieldProps(options);
  const name = String(on);
  const value = on.$useWatch();
  const inputRef = useRef<HTMLInputElement | null>(null);
  // This oddly specific state is needed because of the following scenario:
  // Certain inputs allow the user to type invalid values (for example,
  // non-number characters in a number input, Firefox only). These invalid
  // inputs, when asked for their current value, will "lie" and return an
  // empty string (!), which React Hook Form interprets as the actual value.
  // And since we are using the value from React Hook Form to control the
  // floating label's position, this means that the label will not stay up as
  // it should, but move down on blur. The fix is to check the input's
  // ValidityState every time focus is lost, and to keep the label up when
  // bad input is detected.
  // Context: https://stackoverflow.com/a/18853866
  const [badInputOnLastBlur, setBadInputOnLastBlur] = useState(false);
  const {focusHandlers, hasFocusWithin} = useFocusWithin({
    onBlurWithin: () => {
      setBadInputOnLastBlur(inputRef.current?.validity?.badInput ?? false);
    },
  });
  const {ref: rhfRef, onChange, required, ...rhfProps} = on((rules ?? undefined) as never);

  const textFieldProps: UseInputFieldResult<T>['textFieldProps'] = {
    onChange,
    inputProps: {...commonInputProps, ...rhfProps},
    inputRef: mergeRefs(rhfRef, inputRef),
    ...otherCommonProps,
    ...focusHandlers,
    ...rest,
  };

  if ((!readOnly && hasFocusWithin) || isFilled(value) || badInputOnLastBlur) {
    textFieldProps.InputLabelProps = {
      shrink: true,
    };
  }

  return {textFieldProps, name, value};
}

/*
 * Handles common input field behavior implemented on controlled MUI
 * TextFields.
 */
export function useControlledInputField<T>(options: UseInputFieldOptions<T>) {
  const {on, rules, readOnly, monospace, ...rest} = options;
  const textFieldProps = useCommonInputFieldProps(options);
  return {
    ...on.$useController({rules: (rules ?? undefined) as never}),
    textFieldProps: {...textFieldProps, ...rest},
  };
}
