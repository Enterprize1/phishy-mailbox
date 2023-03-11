'use client';
import {trpc} from '~/utils/trpc';
import {SimpleTable, SimpleTableColumn} from '~/components/simple-table';
import {Email} from '@prisma/client';
import Link from 'next/link';

const emailsColumns: SimpleTableColumn<Email>[] = [
  {
    header: 'Identifizierer',
    cell: (s) => s.backofficeIdentifier,
  },
  {
    header: '',
    cell: (e) => {
      return (
        <div className='ml-auto flex w-max gap-2'>
          <Link href={'/admin/emails/' + e.id} className='text-indigo-600'>
            Bearbeiten
          </Link>
          <button className='text-red-600'>Loeschen</button>
        </div>
      );
    },
  },
];

export default function Page() {
  const {data} = trpc.email.getAll.useQuery();

  return (
    <>
      <div className='mb-2 flex content-center justify-between'>
        <h2>E-Mails</h2>
        <Link
          className='flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
          href='/admin/emails/create'
        >
          Anlegen
        </Link>
      </div>
      <SimpleTable columns={emailsColumns} items={data ?? []} />
    </>
  );
}
