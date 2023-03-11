import {FocusEventHandler, useCallback, useState} from 'react';

interface UseFocusWithinOptions {
  onFocusWithin?: FocusEventHandler<HTMLElement>;
  onBlurWithin?: FocusEventHandler<HTMLElement>;
}

/**
 * Handles focus events for the target and its descendants.
 *
 * Based on @react-aria/interactions/useFocusWithin
 */
export default function useFocusWithin(options: UseFocusWithinOptions = {}) {
  const {onFocusWithin, onBlurWithin} = options;
  const [hasFocusWithin, setHasFocusWithin] = useState(false);

  const onFocus = useCallback<FocusEventHandler<HTMLElement>>(
    (e) => {
      setHasFocusWithin(true);
      if (onFocusWithin) {
        onFocusWithin(e);
      }
    },
    [setHasFocusWithin, onFocusWithin],
  );

  const onBlur = useCallback<FocusEventHandler<HTMLElement>>(
    (e) => {
      if (hasFocusWithin && !e.currentTarget.contains(e.relatedTarget)) {
        setHasFocusWithin(false);
        if (onBlurWithin) {
          onBlurWithin(e);
        }
      }
    },
    [hasFocusWithin, setHasFocusWithin, onBlurWithin],
  );

  return {focusHandlers: {onFocus, onBlur}, hasFocusWithin};
}
