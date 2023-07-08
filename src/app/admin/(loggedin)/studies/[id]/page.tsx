'use client';
import {useFormBuilder} from '@atmina/formbuilder';
import {Participation, Study, Folder, StudyEmail} from '@prisma/client';
import {trpc} from '~/utils/trpc';
import {FC, useEffect, useMemo} from 'react';
import Form from '../../../../../components/forms/Form';
import InputField from '../../../../../components/forms/fields/InputField';
import {SimpleTable, SimpleTableColumn} from '~/components/simple-table';
import {format} from 'date-fns';
import TextArea from '~/components/forms/fields/TextArea';
import MasterDetailView from '~/components/forms/fields/MasterDetailView';
import {CheckboxField} from '~/components/forms/fields/CheckboxField';
import SelectField from '~/components/forms/fields/SelectField';
import {useRouter} from 'next/navigation';
import {useTranslation} from 'react-i18next';
import {Headline} from '~/components/headline';

type FormFolder = Omit<Folder, 'studyId' | 'id'>;
type FormEmail = Omit<StudyEmail, 'studyId' | 'id'>;

const ParticipationTable: FC<{studyId: string}> = ({studyId}) => {
  const {t} = useTranslation(undefined, {keyPrefix: 'admin.studies.edit.participants'});
  const {data: participants, refetch} = trpc.participation.getAllInStudy.useQuery(studyId);
  const builder = useFormBuilder<{count: number}>({defaultValues: {count: 1}});
  const createMultiple = trpc.participation.createMultiple.useMutation();

  const participantsTableColumns: SimpleTableColumn<Participation>[] = useMemo(
    () => [
      {
        header: t('created'),
        cell: (p: Participation) => format(p.createdAt, 'dd.MM.yyyy HH:mm'),
      },
      {
        header: t('code'),
        cell: (p: Participation) => p.code,
      },
      {
        header: t('status'),
        cell: (p: Participation) => {
          if (p.finishedAt) {
            return t('statusCompleted');
          } else if (p.startedAt) {
            return t('statusStarted');
          } else {
            return '';
          }
        },
      },
    ],
    [t],
  );

  if (!participants) return null;

  return (
    <>
      <Headline size={1} className='mb-4 mt-16'>
        {t('title')}
      </Headline>
      <SimpleTable columns={participantsTableColumns} items={participants} />
      <Headline size={2} className='mt-8'>
        {t('addTitle')}
      </Headline>
      <Form
        builder={builder}
        onSubmit={async (data) => {
          await createMultiple.mutateAsync({studyId, count: data.count});
          refetch();
        }}
        className='space-y-4'
      >
        <InputField
          label={t('amount')}
          on={builder.fields.count}
          rules={{valueAsNumber: true}}
          type='number'
          className='block w-full'
        />
        <button
          type='submit'
          className='flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
        >
          {t('add')}
        </button>
      </Form>
    </>
  );
};

export default function PageUpsert({params: {id}}: {params: {id: string}}) {
  const {t} = useTranslation(undefined, {keyPrefix: 'admin.studies.edit'});
  const builder = useFormBuilder<Partial<Study> & {folder: FormFolder[]; email: FormEmail[]}>({
    defaultValues: {
      folder: [],
      email: [],
      durationInMinutes: 10,
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
      await addStudy.mutateAsync({
        study: {
          ...(data as Required<Study>),
          startText: data.startText ?? undefined,
          endText: data.endText ?? undefined,
        },
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateStudy.mutateAsync({id: id, study: data as any});
    }

    router.push('/admin/studies');
  };

  return (
    <div className='max-w-6xl'>
      <Headline size={1} className='mb-4'>
        {isCreate ? t('createTitle') : t('editTitle')}
      </Headline>
      <Form builder={builder} onSubmit={onSubmit} className='flex flex-col'>
        <div className='flex flex-wrap gap-8'>
          <InputField label={t('name')} on={builder.fields.name} rules={{required: true}} />
          <InputField
            label={t('durationInMinutes')}
            on={builder.fields.durationInMinutes}
            rules={{valueAsNumber: true}}
          />
        </div>
        <Headline size={2} className='mt-4'>
          {t('beforeStartHeader')}
        </Headline>
        <TextArea label={t('explanationText')} on={builder.fields.startText} />
        <InputField
          label={t('linkBeforeStart')}
          on={builder.fields.startLinkTemplate}
          helperText={t('linkBeforeStartHelper')}
        />

        <Headline size={2} className='mb-2 mt-4'>
          {t('duringStudyHeader')}
        </Headline>

        <Headline size={3}>{t('folders')}</Headline>
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
              <InputField label={t('folderName')} on={on.name} />
              <CheckboxField label={t('phishing')} on={on.isPhishing} />
            </div>
          )}
        </MasterDetailView>

        <Headline size={3} className='mt-4'>
          {t('emails')}
        </Headline>
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
                label={t('email')}
                on={on.emailId}
              />
              <CheckboxField label={t('phishing')} on={on.isPhishing} />
            </div>
          )}
        </MasterDetailView>
        <Headline size={2} className='mt-4'>
          {t('afterStudyHeader')}
        </Headline>
        <TextArea label={t('explanationText')} on={builder.fields.endText} />
        <InputField
          label={t('linkAfterEnd')}
          on={builder.fields.endLinkTemplate}
          helperText={t('linkAfterEndHelper')}
        />

        <button
          type='submit'
          className='mt-4 flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
        >
          {t('save')}
        </button>
      </Form>
      {!isCreate && <ParticipationTable studyId={id} />}
    </div>
  );
}
