'use client';
import '../styles/globals.css';
import {getBaseUrl, trpc} from '~/utils/trpc';
import i18n from 'i18next';
import {initReactI18next, useTranslation} from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import superjson from 'superjson';
import {httpBatchLink, TRPCClientError} from '@trpc/client';
import {FC, PropsWithChildren, useState} from 'react';
import {QueryCache, QueryClient} from '@tanstack/query-core';
import {QueryClientProvider} from '@tanstack/react-query';
import de from '../locales/de/translation.json';
import en from '../locales/en/translation.json';
import {useRouter} from 'next/navigation';
import {ToastContainer} from 'react-toastify';

import './toastify.css';
import {ConfirmProvider} from 'material-ui-confirm';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    initImmediate: false,
    fallbackLng: 'en',
    load: 'languageOnly',
    resources: {
      de: {
        translation: de,
      },
      en: {
        translation: en,
      },
    },
    detection: {
      caches: ['cookie'],
    },

    interpolation: {
      escapeValue: false,
    },
  });

const TrpcProvider: FC<PropsWithChildren> = (p) => {
  const router = useRouter();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            retryDelay: 100,
          },
        },
        queryCache: new QueryCache({
          onError: (error) => {
            if (typeof window === 'undefined') return false;
            if (!(error instanceof TRPCClientError)) return false;
            if (error.data?.code !== 'UNAUTHORIZED') return false;
            if (!window.location.pathname.startsWith('/admin')) return false;

            router.push('/admin');
          },
        }),
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
        }),
      ],
    }),
  );
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{p.children}</QueryClientProvider>
    </trpc.Provider>
  );
};

const ConfirmProviderFixedType = ConfirmProvider as any; // eslint-disable-line @typescript-eslint/no-explicit-any

export default function AppLayout({children}: PropsWithChildren) {
  const {t} = useTranslation();

  return (
    <ConfirmProviderFixedType
      defaultOptions={{
        title: t('admin.confirm.title'),
        confirmationText: t('admin.confirm.confirmation'),
        cancellationText: t('admin.confirm.cancel'),
      }}
    >
      <TrpcProvider>
        <html className='h-full bg-white'>
          <head>
            <title>Mailbox</title>
          </head>
          <body className='h-full bg-gray-50'>
            {children}
            <ToastContainer limit={3} position='bottom-right' />
          </body>
        </html>
      </TrpcProvider>
    </ConfirmProviderFixedType>
  );
}
