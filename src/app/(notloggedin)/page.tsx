'use client';
import {useFormBuilder} from '@atmina/formbuilder';
import {useRouter} from 'next/navigation';
import {useCallback, useEffect, useState} from 'react';
import InputField from '~/components/forms/fields/InputField';
import Form from '~/components/forms/Form';
import {trpc} from '~/utils/trpc';
import {useTranslation} from 'react-i18next';
import {LanguageChooser} from '~/components/language-chooser';

type CodeForm = {
  code: string;
};

export default function StartStudy() {
  const builder = useFormBuilder<CodeForm>();
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const {data: participation} = trpc.participation.get.useQuery(code as string, {enabled: !!code});
  const {t} = useTranslation();

  const onSubmit = useCallback(async (form: CodeForm) => {
    setCode(form.code);
  }, []);

  useEffect(() => {
    if (participation) {
      router.push('/' + participation.code);
    }
  }, [participation, router]);

  return (
    <div className='flex min-h-full w-full flex-col justify-center bg-gray-100 py-12 sm:px-6 lg:px-8'>
      <div className='sm:mx-auto sm:w-full sm:max-w-md'>
        <h2 className='mt-6 text-center text-3xl font-bold tracking-tight text-gray-900'>
          {t('participants.login.startTitle')}
        </h2>
        <p className='mt-4 text-center text-sm'>{t('participants.login.enterCode')}</p>
      </div>

      <div className='mt-8 bg-white px-4 py-8 shadow sm:mx-auto sm:w-full sm:max-w-max sm:rounded-lg sm:px-10'>
        <Form builder={builder} className='space-y-4' onSubmit={onSubmit}>
          {t('languages.language')}: <LanguageChooser />
          <InputField
            label={t('participants.login.enterCodeLabel')}
            on={builder.fields.code}
            className='block w-full'
          />
          <button
            type='submit'
            className='flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
          >
            {t('participants.login.startButton')}
          </button>
        </Form>
      </div>
    </div>
  );
}
