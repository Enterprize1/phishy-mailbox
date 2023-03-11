'use client';
import type {Study} from '@prisma/client';
import {SimpleTable, SimpleTableColumn} from '~/components/simple-table';
import {trpc} from '~/utils/trpc';
import Link from 'next/link';

const studiesColumns: SimpleTableColumn<Study & {_count: {participation: number}}>[] = [
  {
    header: 'Name',
    cell: (s) => s.name,
  },
  {
    header: 'Code',
    cell: (s) => s.code,
  },
  {
    header: 'Teilnehmende',
    // eslint-disable-next-line no-underscore-dangle
    cell: (s) => s._count.participation,
  },
  {
    header: '',
    cell: (s) => {
      return (
        <div className='ml-auto flex w-max gap-2'>
          <Link href={'/admin/studies/' + s.id} className='text-indigo-600'>
            Bearbeiten
          </Link>
          <button className='text-red-600'>Loeschen</button>
        </div>
      );
    },
  },
];

export default function Page() {
  const {data} = trpc.study.getAll.useQuery();

  return (
    <>
      <div className='mb-2 flex content-center justify-between'>
        <h2>Studien</h2>
        <Link
          className='flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
          href='/admin/studies/create'
        >
          Anlegen
        </Link>
      </div>
      <SimpleTable columns={studiesColumns} items={data ?? []} />
    </>
  );
}
