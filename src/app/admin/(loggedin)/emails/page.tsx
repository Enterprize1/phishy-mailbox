'use client';
import {trpc} from '~/utils/trpc';
import {SimpleTable, SimpleTableColumn} from '~/components/simple-table';
import {Email} from '@prisma/client';
import Link from 'next/link';
import {FC, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useDropzone} from 'react-dropzone';
import {LinearProgress} from '@mui/material';

const UploadMultiple: FC<{refetch: () => void}> = ({refetch}) => {
  const {t} = useTranslation(undefined, {keyPrefix: 'admin.emails.list'});
  const parseMail = trpc.email.parseFile.useMutation();
  const addMail = trpc.email.add.useMutation();
  const [progress, setProgress] = useState<number | null>(null);

  const {getRootProps, getInputProps} = useDropzone({
    onDrop: async (acceptedFiles) => {
      try {
        for (let i = 0; i < acceptedFiles.length; i++) {
          setProgress((i / acceptedFiles.length) * 100);
          const file = acceptedFiles[i];
          if (!file) continue;

          const readFile = new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const base64 = await readFile;

          const parsedFile = await parseMail.mutateAsync({file: base64});
          await addMail.mutateAsync({email: parsedFile});
        }
      } finally {
        setProgress(null);
        refetch();
      }
    },
    accept: {
      'message/rfc822': ['.eml', '.msg'],
    },
  });

  return (
    <>
      <h3 className='mb-4 mt-8 text-lg font-bold'>{t('uploadMultiple')}</h3>
      <div
        {...getRootProps({
          className:
            'align-center px-4 py-6 border-2 border-dashed rounded-sm cursor-pointer min-h-[10rem] flex items-center justify-center',
        })}
      >
        <input {...getInputProps()} />
        {progress === null ? (
          <p>{t('dragDrop')}</p>
        ) : (
          <LinearProgress value={progress} variant='determinate' className='w-1/2' />
        )}
      </div>
    </>
  );
};

export default function Page() {
  const {data, refetch} = trpc.email.getAll.useQuery();
  const {t} = useTranslation(undefined, {keyPrefix: 'admin.emails.list'});

  const emailsColumns: SimpleTableColumn<Email>[] = useMemo(
    () => [
      {
        header: t('identifier'),
        cell: (s) => s.backofficeIdentifier,
      },
      {
        header: '',
        cell: (e) => {
          return (
            <div className='ml-auto flex w-max gap-2'>
              <Link href={'/admin/emails/' + e.id} className='text-indigo-600'>
                {t('edit')}
              </Link>
              <button className='text-red-600'>{t('delete')}</button>
            </div>
          );
        },
      },
    ],
    [t],
  );

  return (
    <div className='max-w-6xl'>
      <div className='mb-2 flex content-center justify-between'>
        <h2 className='my-4 text-xl font-bold'>{t('emails')}</h2>
        <Link
          className='flex justify-center self-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
          href='/admin/emails/create'
        >
          {t('create')}
        </Link>
      </div>
      <SimpleTable columns={emailsColumns} items={data ?? []} />
      <UploadMultiple refetch={refetch} />
    </div>
  );
}
