'use client';
import {trpc} from '~/utils/trpc';
import {SimpleTable, SimpleTableColumn} from '~/components/simple-table';
import {User} from '@prisma/client';
import Link from 'next/link';
import {useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {toast} from 'react-toastify';
import {useConfirm} from 'material-ui-confirm';
import {Headline} from '~/components/headline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function Page() {
  const {data, refetch} = trpc.user.getAll.useQuery();
  const {mutateAsync: deleteUser} = trpc.user.delete.useMutation();
  const {t} = useTranslation(undefined, {keyPrefix: 'admin.users'});
  const confirm = useConfirm();

  const deleteClick = useCallback(
    async (id: string) => {
      try {
        await confirm({
          description: t('list.deleteConfirm'),
        });
      } catch (e) {
        return;
      }

      try {
        await deleteUser(id);
        toast.success(t('list.deletedSuccess'));
        refetch();
      } catch (e) {
        toast.error(t('list.deletedError'));
      }
    },
    [confirm, deleteUser, refetch, t],
  );

  const usersColumns: SimpleTableColumn<Omit<User, 'password'>>[] = useMemo(
    () => [
      {
        header: t('list.email'),
        cell: (u) => u.email,
      },
      {
        header: t('common.canManageUsers'),
        cell: (e) => e.canManageUsers ? <CheckCircleIcon className="h-5 w-5 text-green-600" /> : <XCircleIcon className="h-5 w-5 text-red-600" />,
      },
      {
        header: '',
        cell: (e) => {
          return (
            <div className='ml-auto flex w-max gap-2'>
              <Link href={'/admin/users/' + e.id} className='text-indigo-600'>
                {t('list.edit')}
              </Link>
              <button className='text-red-600' type='button' onClick={() => deleteClick(e.id)}>
                {t('list.delete')}
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
        <Headline size={1}>{t('list.users')}</Headline>
        <Link
          className='flex justify-center self-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
          href='/admin/users/create'
        >
          {t('list.create')}
        </Link>
      </div>
      <SimpleTable columns={usersColumns} items={data ?? []} />
    </div>
  );
}
