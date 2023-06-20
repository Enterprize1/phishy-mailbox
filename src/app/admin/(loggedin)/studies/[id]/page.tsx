'use client';
import {useFormBuilder} from '@atmina/formbuilder';
import {Participation, Study, Folder, StudyEmail} from '@prisma/client';
import {trpc} from '~/utils/trpc';
import {FC, useEffect} from 'react';
import Form from '../../../../../components/forms/Form';
import InputField from '../../../../../components/forms/fields/InputField';
import {SimpleTable, SimpleTableColumn} from '~/components/simple-table';
import {format} from 'date-fns';
import TextArea from '~/components/forms/fields/TextArea';
import MasterDetailView from '~/components/forms/fields/MasterDetailView';
import {CheckboxField} from '~/components/forms/fields/CheckboxField';
import SelectField from '~/components/forms/fields/SelectField';
import {useRouter} from 'next/navigation';

const participantsTableColumns: SimpleTableColumn<Participation>[] = [
  {
    header: 'Erstellt',
    cell: (p: Participation) => format(p.createdAt, 'dd.MM.yyyy HH:mm'),
  },
  {
    header: 'Code',
    cell: (p: Participation) => p.code,
  },
  {
    header: 'Status',
    cell: (p: Participation) => {
      if (p.finishedAt) {
        return 'Beendet';
      } else if (p.startedAt) {
        return 'Begonnen';
      } else {
        return '';
      }
    },
  },
];

type FormFolder = Omit<Folder, 'studyId' | 'id'>;
type FormEmail = Omit<StudyEmail, 'studyId' | 'id'>;

const ParticipationTable: FC<{studyId: string}> = ({studyId}) => {
  const {data: participants, refetch} = trpc.participation.getAllInStudy.useQuery(studyId);
  const builder = useFormBuilder<{count: number}>({defaultValues: {count: 1}});
  const createMultiple = trpc.participation.createMultiple.useMutation();

  if (!participants) return null;

  return (
    <>
      <h3 className='mb-2 mt-4 text-lg'>Teilnehmende</h3>
      <SimpleTable columns={participantsTableColumns} items={participants} />
      <h4 className='mb-2 mt-8 text-lg'>Weitere Teilnehmende hinzufügen</h4>
      <Form
        builder={builder}
        onSubmit={async (data) => {
          await createMultiple.mutateAsync({studyId, count: data.count});
          refetch();
        }}
        className='space-y-4'
      >
        <InputField
          label='Anzahl'
          on={builder.fields.count}
          rules={{valueAsNumber: true}}
          type='number'
          className='block w-full'
        />
        <button
          type='submit'
          className='flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
        >
          Hinzufügen
        </button>
      </Form>
    </>
  );
};

export default function PageUpsert({params: {id}}: {params: {id: string}}) {
  const builder = useFormBuilder<Partial<Study> & {folder: FormFolder[]; email: FormEmail[]}>({
    defaultValues: {
      folder: [],
      email: [],
    },
  });
  const addStudy = trpc.study.add.useMutation();
  const updateStudy = trpc.study.update.useMutation();
  const emails = trpc.email.getAll.useQuery();

  const isCreate = id === 'create';
  const getStudy = trpc.study.get.useQuery(id, {enabled: !isCreate});
  const router = useRouter();

  useEffect(() => {
    if (isCreate) return;
    if (!getStudy.data) return;
    builder.reset(getStudy.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getStudy.data, isCreate]);

  const onSubmit = async (data: Partial<Study>) => {
    if (isCreate) {
      await addStudy.mutateAsync({study: data as Required<Study>});
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateStudy.mutateAsync({id: id, study: data as any});
    }

    router.push('/admin/studies');
  };

  return (
    <>
      <h2 className='my-4 text-lg '>{isCreate ? 'Studie anlegen' : 'Studie bearbeiten'}</h2>
      <Form builder={builder} onSubmit={onSubmit} className='flex flex-col'>
        <div className='flex flex-wrap gap-8'>
          <InputField label='Name' on={builder.fields.name} />
        </div>
        <TextArea label='Erklärungstext' on={builder.fields.introductionText} />

        <InputField label='Dauer in Minuten' on={builder.fields.durationInMinutes} rules={{valueAsNumber: true}} />
        <InputField
          label='Link vor dem Start'
          on={builder.fields.startLinkTemplate}
          helperText='Link, der nach der Eingabe des Zugangscodes angezeigt wird. Format: https://example.com/{code} wobei {code} durch den Zugangscode ersetzt wird.'
        />
        <InputField
          label='Link nach dem Ende'
          on={builder.fields.endLinkTemplate}
          helperText='Link, der nach Bearbeitung angezeigt wird. Format: https://example.com/{code} wobei {code} durch den Zugangscode ersetzt wird.'
        />

        <h3 className='text-md mb-2 mt-8 font-bold'>Ordner</h3>
        <MasterDetailView
          on={builder.fields.folder}
          detailLabel={(v) => v.name}
          defaultValue={{
            name: '',
            order: builder.fields.folder.$useFieldArray().fields.length,
            isPhishing: false,
          }}
          reorder
        >
          {(on) => (
            <div className='flex flex-col'>
              <InputField label='Name' on={on.name} />
              <CheckboxField label='Phishing' on={on.isPhishing} />
            </div>
          )}
        </MasterDetailView>

        <h3 className='text-md mb-2 mt-8 font-bold'>E-Mail</h3>
        <MasterDetailView
          on={builder.fields.email}
          detailLabel={(v) => emails.data?.find((e) => e.id === v.emailId)?.backofficeIdentifier ?? 'E-Mail'}
          defaultValue={{
            emailId: '',
            isPhishing: false,
          }}
        >
          {(on) => (
            <div className='flex flex-col'>
              <SelectField
                items={
                  emails.data?.map((e) => {
                    return {name: e.backofficeIdentifier, value: e.id, key: e.id};
                  }) ?? []
                }
                label='E-Mail'
                on={on.emailId}
              />
              <CheckboxField label='Phishing' on={on.isPhishing} />
            </div>
          )}
        </MasterDetailView>

        <button
          type='submit'
          className='mt-4 flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
        >
          Speichern
        </button>
      </Form>
      {!isCreate && <ParticipationTable studyId={id} />}
    </>
  );
}
