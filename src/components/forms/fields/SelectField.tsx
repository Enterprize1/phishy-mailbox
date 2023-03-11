import {TextField, TextFieldProps} from '@mui/material';
import {useCallback} from 'react';
import {useControlledInputField} from '../useInputField';
import {
  CollectionFieldProps,
  findCollectionItemByKey,
  findCollectionItemByValue,
  getCollectionItemKey,
} from './collections';

export type SelectFieldProps<T> = CollectionFieldProps<T> & {valueIdentifier?: keyof T};

function SelectField<T>({items, valueIdentifier, ...props}: SelectFieldProps<T>) {
  const {
    field: {ref, onChange, onBlur, value},
    textFieldProps,
  } = useControlledInputField(props);

  const handleChange = useCallback<Exclude<TextFieldProps['onChange'], undefined>>(
    (event) => {
      const item = findCollectionItemByKey(items, event.target.value);
      if (item) {
        onChange(item.value);
      }
    },
    [items, onChange],
  );

  const currentItem = findCollectionItemByValue(items, value as T, props.on, valueIdentifier);

  return (
    <TextField
      select
      type='select'
      SelectProps={{native: true}}
      onChange={handleChange}
      onBlur={onBlur}
      inputRef={ref}
      value={currentItem ? currentItem.key ?? getCollectionItemKey(currentItem.value) : ''}
      size='small'
      {...textFieldProps}
      InputLabelProps={currentItem == null && value == null ? {shrink: false} : undefined}
    >
      {
        /* Hidden option prevents the next option in line from being selected by default when no other options match */
        currentItem == null && <option hidden>{value != null && String(value)}</option>
      }
      {items.map(({value: itemValue, key: itemKey = getCollectionItemKey(itemValue), name: itemName = itemKey}) => (
        <option value={itemKey} key={itemKey} className='m-3 appearance-none'>
          {itemName}
        </option>
      ))}
    </TextField>
  );
}

export default SelectField;
