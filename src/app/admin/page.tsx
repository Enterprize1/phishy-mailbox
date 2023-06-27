'use client';
import {signIn} from 'next-auth/react';
import InputField from '../../components/forms/fields/InputField';
import {useFormBuilder} from '@atmina/formbuilder';
import Form from '../../components/forms/Form';
import {useCallback} from 'react';
import {useRouter} from 'next/navigation';

type LoginForm = {
  email: string;
  password: string;
};

export default function Login() {
  const router = useRouter();
  const builder = useFormBuilder<LoginForm>();

  const onSubmit = useCallback(
    async (form: LoginForm) => {
      await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      router.push('/admin/emails');
    },
    [router],
  );

  return (
    <div className='flex min-h-full w-full flex-col justify-center bg-gray-100 py-12 sm:px-6 lg:px-8'>
      <div className='sm:mx-auto sm:w-full sm:max-w-md'>
        <h2 className='mt-6 text-center text-3xl font-bold tracking-tight text-gray-900'>Login</h2>
      </div>

      <div className='mt-8 bg-white px-4 py-8 shadow sm:mx-auto sm:w-full sm:max-w-max sm:rounded-lg sm:px-10'>
        <Form builder={builder} className='space-y-4' onSubmit={onSubmit}>
          <InputField label='E-Mail Adresse' on={builder.fields.email} className='block w-full' />
          <InputField label='Passwort' on={builder.fields.password} type='password' className='block w-full' />

          <button
            type='submit'
            className='flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
          >
            Sign in
          </button>
        </Form>
      </div>
    </div>
  );
}
