// Based on https://github.com/gregberge/react-merge-refs

import React from 'react';

export default function mergeRefs<T = unknown>(
  ...refs: (React.MutableRefObject<T> | React.LegacyRef<T> | null | undefined)[]
): React.RefCallback<T> {
  return (value) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    }
  };
}
