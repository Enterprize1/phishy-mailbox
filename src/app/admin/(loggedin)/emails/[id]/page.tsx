'use client';
import {useDropzone} from 'react-dropzone';
import {trpc} from '~/utils/trpc';
import Form from '~/components/forms/Form';
import {useFormBuilder} from '@atmina/formbuilder';
import InputField from '~/components/forms/fields/InputField';
import {Email, ExternalImageMode} from '@prisma/client';
import CodeTextarea from '~/components/forms/fields/CodeTextarea';
import EmailDisplay from '~/components/email-display';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useTranslation} from 'react-i18next';
import {Headline} from '~/components/headline';
import {toast} from 'react-toastify';
import {CheckboxField} from '~/components/forms/fields/CheckboxField';

const EmlDropzone = ({onNewMessage}: {onNewMessage: (email: Partial<Email>) => void}) => {
  const {t} = useTranslation(undefined, {keyPrefix: 'admin.emails.edit'});
  const parseMail = trpc.email.parseFile.useMutation();

  const {getRootProps, getInputProps} = useDropzone({
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const readFile = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64 = await readFile;

      const parsedFile = await parseMail.mutateAsync({file: base64});

      onNewMessage(parsedFile);
    },
    accept: {
      'message/rfc822': ['.eml', '.msg'],
    },
  });

  return (
    <div
      {...getRootProps({
        className:
          'align-center px-4 py-6 border-2 border-dashed rounded-sm cursor-pointer min-h-[6rem] flex items-center justify-center',
      })}
    >
      <input {...getInputProps()} />
      <p>{t('dragDrop')}</p>
    </div>
  );
};

export default function Page({params: {id}}: {params: {id: string}}) {
  const builder = useFormBuilder<Partial<Email>>({
    defaultValues: {
      subject: '',
      body: '',
      headers: '',
      senderMail: '',
      senderName: '',
      allowExternalImages: false,
      backofficeIdentifier: '',
    },
  });
  const addMail = trpc.email.add.useMutation();
  const updateMail = trpc.email.update.useMutation();
  const {t} = useTranslation(undefined, {keyPrefix: 'admin.emails.edit'});

  const isCreate = id === 'create';
  const getMail = trpc.email.get.useQuery(id, {enabled: !isCreate});
  const router = useRouter();

  useEffect(() => {
    if (isCreate) return;
    if (!getMail.data) return;
    builder.reset(getMail.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getMail.data, isCreate]);

  const onSubmit = async (data: Partial<Email>) => {
    try {
      if (isCreate) {
        await addMail.mutateAsync({email: data as Required<Email>});
      } else {
        await updateMail.mutateAsync({id: id, email: data as Required<Email>});
      }

      router.push('/admin/emails');
    } catch (e) {
      toast.error(t('errorDuringSave'));
    }
  };

  const onNewMessage = (message: Partial<Email>) => {
    builder.reset(message);
  };

  const email = builder.watch();

  return (
    <div className='max-w-6xl'>
      <Headline size={1} className='mb-4'>
        {isCreate ? t('createEmail') : t('editEmail')}
      </Headline>
      <Headline size={2} className='mb-4'>
        {t('uploadEmail')}
      </Headline>
      <EmlDropzone onNewMessage={onNewMessage} />
      <Headline size={2} className='mt-8'>
        {isCreate ? t('createEmailManually') : t('editEmailManually')}
      </Headline>
      <Form builder={builder} onSubmit={onSubmit}>
        <div className='my-2 flex flex-col gap-x-8 gap-y-2'>
          <InputField label={t('identifier')} on={builder.fields.backofficeIdentifier} rules={{required: true}} />
          <fieldset className='flex flex-wrap'>
            <legend className='text-md font-semibold'>{t('sender')}</legend>
            <div className='flex gap-4'>
              <InputField label={t('senderEmail')} on={builder.fields.senderMail} className='mr-2' />
              <InputField label={t('senderName')} on={builder.fields.senderName} />
            </div>
          </fieldset>
          <InputField label={t('subject')} on={builder.fields.subject} />
        </div>
        <Headline size={3}>{t('header')}</Headline>
        <CodeTextarea label={t('header')} on={builder.fields.headers} language='text' />

        <Headline size={3} className='mt-4'>
          {t('content')}
        </Headline>
        <CodeTextarea label={t('content')} on={builder.fields.body} />
        <CheckboxField label={t('allowExternalImages')} on={builder.fields.allowExternalImages} />
        <button
          type='submit'
          className='mt-4 flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
        >
          {t('save')}
        </button>
      </Form>

      <EmailDisplay
        email={email}
        studyId=''
        studyExternalImageMode={email.allowExternalImages ? ExternalImageMode.ASK : ExternalImageMode.HIDE}
        className='mt-12'
      />
    </div>
  );
}
