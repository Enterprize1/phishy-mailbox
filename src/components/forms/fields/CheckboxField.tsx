import {Checkbox, FormControlLabel} from '@mui/material';
import {FieldProps} from './common';
import {FC} from 'react';

export const CheckboxField: FC<FieldProps<boolean>> = ({label, on, rules, disabled, ...rest}) => {
  const {
    field: {ref, value, ...checkboxProps},
  } = on.$useController(rules ?? {});

  const checkbox = <Checkbox checked={!!value} inputRef={ref} disabled={disabled} {...checkboxProps} />;

  return <FormControlLabel label={label} control={checkbox} labelPlacement='end' {...rest} />;
};
