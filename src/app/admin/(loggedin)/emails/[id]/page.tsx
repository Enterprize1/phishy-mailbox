'use client';
import {useDropzone} from 'react-dropzone';
import {trpc} from '~/utils/trpc';
import Form from '~/components/forms/Form';
import {useFormBuilder} from '@atmina/formbuilder';
import InputField from '~/components/forms/fields/InputField';
import {Email} from '@prisma/client';
import CodeTextarea from '~/components/forms/fields/CodeTextarea';
import EmailDisplay from '~/components/email-display';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';

const EmlDropzone = ({onNewMessage}: {onNewMessage: (email: Partial<Email>) => void}) => {
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
        className: 'align-center px-4 py-6 border-2 border-dashed rounded-sm cursor-pointer',
      })}
    >
      <input {...getInputProps()} />
      <p>Ziehe eine .eml Datei hier hin oder klicke um eine auszuwaehlen</p>
    </div>
  );
};

export default function Page({params: {id}}: {params: {id: string}}) {
  const builder = useFormBuilder<Partial<Email>>();
  const addMail = trpc.email.add.useMutation();
  const updateMail = trpc.email.update.useMutation();

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
    if (isCreate) {
      await addMail.mutateAsync({email: data as Required<Email>});
    } else {
      await updateMail.mutateAsync({id: id, email: data as Required<Email>});
    }

    router.push('/admin/emails');
  };

  const onNewMessage = (message: Partial<Email>) => {
    builder.reset(message);
  };

  const email = builder.watch();

  return (
    <>
      <h2 className='my-4 text-lg '>{isCreate ? 'E-Mail anlegen' : 'E-Mail bearbeiten'}</h2>
      <EmlDropzone onNewMessage={onNewMessage} />
      <Form builder={builder} onSubmit={onSubmit}>
        <div className='my-4 flex flex-wrap gap-x-8 gap-y-2'>
          <div className='w-full'>
            <InputField label='Identifizierer im Backoffice' on={builder.fields.backofficeIdentifier} />
          </div>
          <fieldset>
            <legend className='text-sm font-bold'>Absender</legend>
            <InputField label='E-Mail' on={builder.fields.senderMail} className='mr-2' />
            <InputField label='Name' on={builder.fields.senderName} />
          </fieldset>
        </div>
        <InputField label='Betreff' on={builder.fields.subject} />
        <h3 className='text-sm font-bold'>Inhalt (HTML)</h3>
        <CodeTextarea label='Body' on={builder.fields.body} />
        <button
          type='submit'
          className='mt-4 flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
        >
          Speichern
        </button>
      </Form>

      <EmailDisplay email={email} className='mt-12' />
    </>
  );
}
