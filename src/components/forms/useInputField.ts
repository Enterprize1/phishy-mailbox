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
}

// MUI v6 consolidated `inputProps`/`InputProps`/`InputLabelProps` into a single
// `slotProps` object (`htmlInput` = native input attributes, `input` = the Input
// component, `inputLabel` = the floating label).
type TextFieldSlotProps = NonNullable<TextFieldProps['slotProps']>;

const isFilled = (value: unknown) => {
  if (value === '') return false;
  if (value == null) return false;
  return !Number.isNaN(value);
};

type UseInputFieldResult<T> = {
  textFieldProps: Pick<TextFieldProps, 'name' | 'variant' | 'slotProps'> & {
    error?: boolean;
    helperText?: TextFieldProps['helperText'];
    required?: boolean;
    sx?: SxProps<Theme>;
    onFocus?: FocusEventHandler<HTMLElement>;
    onBlur?: FocusEventHandler<HTMLElement>;
    onChange: (event: {target: {name: string; value: unknown}}) => void;
    inputRef: RefCallback<HTMLInputElement>;
    label?: TextFieldProps['label'];
    disabled?: boolean;
  };
  name: string;
  value: T;
};

function useCommonInputFieldProps<T>(options: UseInputFieldOptions<T>) {
  const {on, readOnly, monospace, rules, label, disabled} = options;
  const name = String(on);
  const {errorText} = useFieldEnhancements({on});

  const htmlInput: Record<string, unknown> = {};
  const input: Record<string, unknown> = {};

  if (monospace) {
    htmlInput['data-monospace'] = true;
  }

  if (readOnly) {
    input.readOnly = true;
  }

  if (rules?.required) {
    input.required = true;
  }

  if (typeof rules?.min === 'number') {
    htmlInput.min = rules.min;
  }

  if (typeof rules?.max === 'number') {
    htmlInput.max = rules.max;
  }

  const result: Pick<
    TextFieldProps,
    'name' | 'variant' | 'slotProps' | 'sx' | 'label' | 'error' | 'helperText' | 'disabled'
  > = {
    slotProps: {htmlInput, input} as TextFieldSlotProps,
    sx: {my: 1},
    name,
    variant: 'outlined',
    label,
  };

  if (errorText) {
    result.error = true;
    result.helperText = errorText;
  }

  if (disabled) {
    result.disabled = true;
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
  const {on, rules, readOnly, monospace, ...rest} = options;
  const {slotProps: commonSlotProps, ...otherCommonProps} = useCommonInputFieldProps(options);
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

  const common = (commonSlotProps ?? {}) as TextFieldSlotProps;
  const slotProps: TextFieldSlotProps = {
    ...common,
    htmlInput: {...(common.htmlInput as object), ...rhfProps},
  };

  if ((!readOnly && hasFocusWithin) || isFilled(value) || badInputOnLastBlur) {
    slotProps.inputLabel = {shrink: true};
  }

  const textFieldProps: UseInputFieldResult<T>['textFieldProps'] = {
    onChange,
    inputRef: mergeRefs(rhfRef, inputRef),
    ...otherCommonProps,
    ...focusHandlers,
    ...rest,
    slotProps,
  };

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
