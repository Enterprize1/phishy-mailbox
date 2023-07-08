import {FC, PropsWithChildren} from 'react';
import {twMerge} from 'tailwind-merge';

export const Headline: FC<PropsWithChildren<{className?: string; size: 1 | 2 | 3}>> = ({children, className, size}) => {
  switch (size) {
    case 1:
      return <h2 className={twMerge('text-2xl font-bold', className)}>{children}</h2>;
    case 2:
      return <h3 className={twMerge('text-xl font-semibold', className)}>{children}</h3>;
    case 3:
      return <h4 className={twMerge('text-md font-semibold', className)}>{children}</h4>;
  }
};
