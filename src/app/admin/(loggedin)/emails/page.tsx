'use client';
import {trpc} from '~/utils/trpc';
import {SimpleTable, SimpleTableColumn} from '~/components/simple-table';
import {Email} from '@prisma/client';
import Link from 'next/link';
import {FC, useCallback, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useDropzone} from 'react-dropzone';
import {LinearProgress} from '@mui/material';
import {toast} from 'react-toastify';
import {useConfirm} from 'material-ui-confirm';
import {Headline} from '~/components/headline';

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
      <Headline size={2} className='mb-4 mt-8'>
        {t('uploadMultiple')}
      </Headline>
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
  const {mutateAsync: deleteMail} = trpc.email.delete.useMutation();
  const {t} = useTranslation(undefined, {keyPrefix: 'admin.emails.list'});
  const confirm = useConfirm();

  const deleteClick = useCallback(
    async (id: string) => {
      try {
        await confirm({
          description: t('deleteConfirm'),
        });
      } catch (e) {
        return;
      }

      try {
        await deleteMail(id);
        toast.success(t('deletedSuccess'));
        refetch();
      } catch (e) {
        toast.error(t('deletedError'));
      }
    },
    [confirm, deleteMail, refetch, t],
  );

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
              <button className='text-red-600' type='button' onClick={() => deleteClick(e.id)}>
                {t('delete')}
              </button>
            </div>
          );
        },
      },
    ],
    [deleteClick, t],
  );

  return (
    <div className='max-w-6xl'>
      <div className='mb-2 flex content-center justify-between'>
        <Headline size={1}>{t('emails')}</Headline>
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
