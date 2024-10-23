'use client';
import {trpc} from '~/utils/trpc';
import Form from '~/components/forms/Form';
import {useFormBuilder} from '@atmina/formbuilder';
import InputField from '~/components/forms/fields/InputField';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useTranslation} from 'react-i18next';
import {Headline} from '~/components/headline';
import {toast} from 'react-toastify';
import { CheckboxField } from '~/components/forms/fields/CheckboxField';
import { useSession } from 'next-auth/react';

export default function Page({params: {id}}: {params: {id: string}}) {
  const builder = useFormBuilder<{email: string; password: string; canManageUsers: boolean}>({
    defaultValues: {
      email: '',
      password: '',
      canManageUsers: false,
    },
  });
  const addUser = trpc.user.add.useMutation();
  const updateUser = trpc.user.update.useMutation();
  const {t} = useTranslation(undefined, {keyPrefix: 'admin.users'});

  const isCreate = id === 'create';
  const getMail = trpc.user.get.useQuery(id, {enabled: !isCreate});
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (isCreate) return;
    if (!getMail.data) return;
    builder.reset(getMail.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getMail.data, isCreate]);

  const onSubmit = async (data: {email: string; password: string; canManageUsers: boolean}) => {
    try {
      if (isCreate) {
        await addUser.mutateAsync(data);
      } else {
        await updateUser.mutateAsync({id: id, ...data});
      }

      router.push('/admin/users');
    } catch (e) {
      toast.error(t('edit.errorDuringSave'));
    }
  };

  return (
    <div className='max-w-6xl'>
      <Headline size={1} className='mb-4'>
        {isCreate ? t('edit.createUser') : t('edit.editUser')}
      </Headline>
      <Form builder={builder} onSubmit={onSubmit} className='my-2 flex flex-col gap-x-8 gap-y-2'>
        <InputField label={t('edit.email')} on={builder.fields.email} rules={{required: true}} />
        <InputField
          label={t('edit.password')}
          on={builder.fields.password}
          rules={{required: isCreate}}
          helperText={isCreate ? undefined : t('edit.passwordHint')}
          type='password'
        />
        {session.data?.user?.canManageUsers && (
          <div>
            <CheckboxField
              label={t('common.canManageUsers')} 
              on={builder.fields.canManageUsers}
              disabled={session.data.user.id === id}
            />
            <div className="text-sm text-gray-500 ml-8">
              {t('common.canManageUsersHelperText')}
            </div>
          </div>
        )}

        <button
          type='submit'
          className='mt-4 flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
        >
          {t('edit.save')}
        </button>
      </Form>
    </div>
  );
}
