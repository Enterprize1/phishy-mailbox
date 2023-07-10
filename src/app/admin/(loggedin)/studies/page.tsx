'use client';
import type {Study} from '@prisma/client';
import {SimpleTable, SimpleTableColumn} from '~/components/simple-table';
import {trpc} from '~/utils/trpc';
import Link from 'next/link';
import {FC, useCallback, useMemo} from 'react';
import papaparse from 'papaparse';
import {useTranslation} from 'react-i18next';
import {toast} from 'react-toastify';
import {useConfirm} from 'material-ui-confirm';
import {Headline} from '~/components/headline';

const ExportButton: FC<{studyId: string}> = ({studyId}) => {
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
      {t('export')}
    </button>
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
              <ExportButton studyId={s.id} />

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
    </div>
  );
}
