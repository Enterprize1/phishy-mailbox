import {TextField} from '@mui/material';
import {useInputField} from '../useInputField';
import {FieldProps} from './common';

function TextArea<T = string>(props: FieldProps<T>) {
  const {textFieldProps} = useInputField(props);

  return <TextField size='small' multiline={true} {...textFieldProps} minRows={3} />;
}

export default TextArea;
