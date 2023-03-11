import {TextField} from '@mui/material';
import {useInputField} from '../useInputField';
import {FieldProps} from './common';

function InputField<T = string>(props: FieldProps<T>) {
  const {textFieldProps} = useInputField(props);

  return <TextField size='small' {...textFieldProps} />;
}

export default InputField;
