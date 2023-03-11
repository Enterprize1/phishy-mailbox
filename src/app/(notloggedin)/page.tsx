'use client';
import {useFormBuilder} from '@atmina/formbuilder';
import {useRouter} from 'next/navigation';
import {useCallback} from 'react';
import InputField from '~/components/forms/fields/InputField';
import Form from '~/components/forms/Form';
import {trpc} from '~/utils/trpc';

type CodeForm = {
  code: string;
};

export default function StartStudy() {
  const builder = useFormBuilder<CodeForm>();
  const createParticipation = trpc.participation.create.useMutation();
  const router = useRouter();

  const onSubmit = useCallback(
    async (form: CodeForm) => {
      const participation = await createParticipation.mutateAsync(form.code);
      router.push(`/${participation.id}`);
    },
    [createParticipation, router],
  );

  return (
    <div className='flex min-h-full w-full flex-col justify-center bg-gray-100 py-12 sm:px-6 lg:px-8'>
      <div className='sm:mx-auto sm:w-full sm:max-w-md'>
        <h2 className='mt-6 text-center text-3xl font-bold tracking-tight text-gray-900'>Start</h2>
        <p className='mt-4 text-sm'>Geben Sie hier den Zugangs-Code ein, den Sie erhalten haben.</p>
      </div>

      <div className='mt-8 bg-white px-4 py-8 shadow sm:mx-auto sm:w-full sm:max-w-max sm:rounded-lg sm:px-10'>
        <Form builder={builder} className='space-y-4' onSubmit={onSubmit}>
          <InputField label='Zugangs-Code' on={builder.fields.code} className='block w-full' />

          <button
            type='submit'
            className='flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
          >
            Starten
          </button>
        </Form>
      </div>
    </div>
  );
}
