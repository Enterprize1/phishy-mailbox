import {FieldError, get, useFormContext} from 'react-hook-form';
import {FormBuilder} from '@atmina/formbuilder';

interface UseFieldFeedbackOptions<T> {
  on: FormBuilder<T>;
}

interface FieldEnhancements {
  errorText?: string;
}

const getErrorText = (error: FieldError) => {
  if (error.message) return error.message;
  return 'Ungültiger Wert.';
};

export default function useFieldEnhancements({on}: UseFieldFeedbackOptions<unknown>): FieldEnhancements {
  const {
    formState: {errors},
  } = useFormContext();
  const name = String(on);
  const error = get(errors, name) as FieldError;
  const enhancements: FieldEnhancements = {};

  if (error) {
    enhancements.errorText = getErrorText(error);
  }

  return enhancements;
}
