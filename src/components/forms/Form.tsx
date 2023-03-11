import {PropsWithChildren} from 'react';
import {FieldValues, FormProvider, SubmitHandler, UseFormProps, UseFormReturn} from 'react-hook-form';

export type FormProps<T extends FieldValues> = UseFormProps<T> & {
  builder: UseFormReturn<T>;
  className?: string;
  onSubmit?: SubmitHandler<T>;
};

export default function Form<T extends FieldValues>(props: PropsWithChildren<FormProps<T>>) {
  const {builder, onSubmit, ...formProps} = props;
  return (
    <FormProvider {...builder}>
      <form onSubmit={onSubmit ? builder.handleSubmit(onSubmit) : undefined} {...formProps} />
    </FormProvider>
  );
}
