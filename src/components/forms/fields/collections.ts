import {FieldProps} from './common';

// Shared logic for Select and Radio Group fields.

export type CollectionItem<T> = {
  key?: string | number;
  name?: string;
  value: T;
};

export interface CollectionFieldProps<T> extends FieldProps<T> {
  items: CollectionItem<T>[];
}

export const getCollectionItemKey = (value: unknown) => {
  return value === null ? '%%NULL' : value === undefined ? '%%UNDEFINED' : JSON.stringify(value);
};

export const findCollectionItemByKey = <T>(items: CollectionItem<T>[], key: string | number) => {
  return items.find((needle) => (needle.key ?? getCollectionItemKey(needle.value)) === key);
};

export const findCollectionItemByValue = <T>(
  items: CollectionItem<T>[],
  value: T,
  fieldName: unknown,
  valueIdentifier?: keyof T,
) => {
  const result = items.find((needle) => {
    if (valueIdentifier) return needle.value[valueIdentifier] === value?.[valueIdentifier];

    return needle.value === value;
  });
  if (result == null && value != null && items.length) {
    console.warn(`Value for field "${fieldName}" is ${value} but no item with the corresponding value is defined.`);
  }
  return result;
};
