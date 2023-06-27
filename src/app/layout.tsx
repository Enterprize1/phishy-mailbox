'use client';
import '../styles/globals.css';
import {getBaseUrl, trpc} from '~/utils/trpc';
import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import superjson from 'superjson';
import {httpBatchLink, TRPCClientError} from '@trpc/client';
import {useState} from 'react';
import {QueryCache, QueryClient} from '@tanstack/query-core';
import {QueryClientProvider} from '@tanstack/react-query';
import de from '../locales/de/translation.json';
import en from '../locales/en/translation.json';
import {useRouter} from 'next/navigation';

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

const TrpcProvider: React.FC<{children: React.ReactNode}> = (p) => {
  const router = useRouter();
  const [queryClient] = useState(
    () =>
      new QueryClient({
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

export default function AppLayout({children}: {children: React.ReactNode}) {
  return (
    <TrpcProvider>
      <html className='h-full bg-white'>
        <head>
          <title>Mailbox</title>
        </head>
        <body className='h-full bg-gray-50'>{children}</body>
      </html>
    </TrpcProvider>
  );
}
