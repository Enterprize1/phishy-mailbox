'use client';
import type {Study} from '@prisma/client';
import {SimpleTable, SimpleTableColumn} from '~/components/simple-table';
import {trpc} from '~/utils/trpc';
import Link from 'next/link';
import {FC, useCallback, useMemo, useState} from 'react';
import papaparse from 'papaparse';
import {useTranslation} from 'react-i18next';
import {toast} from 'react-toastify';
import {useConfirm} from 'material-ui-confirm';
import {Headline} from '~/components/headline';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {ArrowDownIcon} from '@heroicons/react/24/solid';
import {ChevronDownIcon} from '@heroicons/react/20/solid';
import {useDropzone} from 'react-dropzone';
import {LinearProgress} from '@mui/material';

const ExportParticipantsCSVButton: FC<{studyId: string}> = ({studyId}) => {
  const {t} = useTranslation(undefined, {keyPrefix: 'admin.studies.list'});
  const exportMutation = trpc.study.export.useMutation();

  const onExport = useCallback(async () => {
    const data = await exportMutation.mutateAsync(studyId);
    const csv = papaparse.unparse(data);
    const csvBlob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const csvURL = URL.createObjectURL(csvBlob);

    const tempLink = document.createElement('a');
    tempLink.href = csvURL;
    tempLink.setAttribute('download', 'export.csv');
    tempLink.click();
  }, [exportMutation, studyId]);

  return (
    <button className='text-indigo-600' type='button' onClick={onExport}>
      {t('participantsData')}
    </button>
  );
};

const ExportStudyStructureButton: FC<{studyId: string}> = ({studyId}) => {
  const {t} = useTranslation(undefined, {keyPrefix: 'admin.studies.list'});
  const exportMutation = trpc.study.exportStudyStructure.useMutation();

  const onExport = useCallback(async () => {
    const data = await exportMutation.mutateAsync(studyId);

    const csvBlob = new Blob([JSON.stringify(data, undefined, 2)], {type: 'application/json;charset=utf-8;'});
    const csvURL = URL.createObjectURL(csvBlob);

    const tempLink = document.createElement('a');
    tempLink.href = csvURL;
    tempLink.setAttribute('download', data.name.replaceAll(new RegExp('[^a-zäöüß]+', 'gi'), '-') + '.export.json');
    tempLink.click();
  }, [exportMutation, studyId]);

  return (
    <button className='text-indigo-600' type='button' onClick={onExport}>
      {t('studyData')}
    </button>
  );
};

const ExportDropdown: FC<{studyId: string}> = ({studyId}) => {
  const {t} = useTranslation(undefined, {keyPrefix: 'admin.studies.list'});

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className='flex text-indigo-600' type='button'>
          {t('export')} <ChevronDownIcon className='mt-px h-4 w-4' />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className='rounded border border-gray-200 bg-white p-1 shadow' align='end'>
          <DropdownMenu.Item>
            <ExportParticipantsCSVButton studyId={studyId} />
          </DropdownMenu.Item>
          <DropdownMenu.Separator className='m-1 h-px bg-gray-300' />
          <DropdownMenu.Item>
            <ExportStudyStructureButton studyId={studyId} />
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

const ImportStudy: FC<{refetch: () => void}> = ({refetch}) => {
  const {t} = useTranslation(undefined, {keyPrefix: 'admin.studies.list'});
  const addMail = trpc.study.importStudy.useMutation();
  const [progress, setProgress] = useState<number | null>(null);

  const {getRootProps, getInputProps} = useDropzone({
    onDrop: async (acceptedFiles) => {
      try {
        for (let i = 0; i < acceptedFiles.length; i++) {
          setProgress((i / acceptedFiles.length) * 100);
          const file = acceptedFiles[i];
          if (!file) continue;

          const studyAsText = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsText(file);
          });

          const parsedFile = JSON.parse(studyAsText);

          await addMail.mutateAsync(parsedFile);
        }
      } finally {
        setProgress(null);
        refetch();
      }
    },
    accept: {
      'application/json': ['.json'],
    },
  });

  return (
    <>
      <Headline size={2} className='mb-4 mt-8'>
        {t('importStudy')}
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
  const {t} = useTranslation(undefined, {keyPrefix: 'admin.studies.list'});
  const {data, refetch} = trpc.study.getAll.useQuery();
  const {mutateAsync: deleteStudy} = trpc.study.delete.useMutation();
  const confirm = useConfirm();

  const onDelete = useCallback(
    async (studyId: string) => {
      try {
        await confirm({
          description: t('deleteConfirm'),
        });
      } catch (e) {
        return;
      }

      try {
        await deleteStudy(studyId);
        toast.success(t('deleteSuccess'));
        refetch();
      } catch (e) {
        toast.error(t('deleteError'));
      }
    },
    [confirm, deleteStudy, refetch, t],
  );

  const studiesColumns: SimpleTableColumn<Study & {_count: {participation: number}}>[] = useMemo(
    () => [
      {
        header: t('name'),
        cell: (s) => s.name,
      },
      {
        header: t('participants'),
        // eslint-disable-next-line no-underscore-dangle
        cell: (s) => s._count.participation,
      },
      {
        header: '',
        cell: (s) => {
          return (
            <div className='ml-auto flex w-max gap-2'>
              <ExportDropdown studyId={s.id} />

              <Link href={'/admin/studies/' + s.id} className='text-indigo-600'>
                {t('edit')}
              </Link>
              <button className='text-red-600' type='button' onClick={() => onDelete(s.id)}>
                {t('delete')}
              </button>
            </div>
          );
        },
      },
    ],
    [onDelete, t],
  );

  return (
    <div className='max-w-6xl'>
      <div className='mb-2 flex content-center justify-between'>
        <Headline size={1}>{t('title')}</Headline>
        <Link
          className='flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
          href='/admin/studies/create'
        >
          {t('create')}
        </Link>
      </div>
      <SimpleTable columns={studiesColumns} items={data ?? []} />
      <ImportStudy refetch={refetch} />
    </div>
  );
}
