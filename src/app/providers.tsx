'use client';
import {getBaseUrl, trpc} from '~/utils/trpc';
import i18next, {type i18n as I18nInstance} from 'i18next';
import {I18nextProvider, initReactI18next, useTranslation} from 'react-i18next';
import I18nLanguageDetector from 'i18next-browser-languagedetector';
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

const baseOptions = {
  initAsync: false,
  fallbackLng: 'en',
  load: 'languageOnly' as const,
  resources: {
    de: {translation: de},
    en: {translation: en},
  },
  interpolation: {
    escapeValue: false,
  },
};

// The initial language is resolved on the server (from the cookie / Accept-Language
// header) and passed in, so the server and the first client render use the same
// language – no flash and no hydration mismatch.
//
// On the client a single instance is shared across renders and persists the chosen
// language to a cookie via the LanguageDetector. On the server a fresh instance is
// created per request so concurrent requests with different languages cannot clobber
// each other's state.
let clientInstance: I18nInstance | undefined;

const getI18n = (language: string): I18nInstance => {
  if (typeof window === 'undefined') {
    const instance = i18next.createInstance();
    instance.use(initReactI18next).init({...baseOptions, lng: language});
    return instance;
  }

  if (!clientInstance) {
    const instance = i18next.createInstance();
    instance
      .use(I18nLanguageDetector)
      .use(initReactI18next)
      .init({...baseOptions, lng: language, detection: {caches: ['cookie']}});
    clientInstance = instance;
  } else if (clientInstance.resolvedLanguage !== language.split('-')[0]) {
    clientInstance.changeLanguage(language);
  }

  return clientInstance;
};

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
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
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

const ConfirmWithTranslation: FC<PropsWithChildren> = ({children}) => {
  const {t} = useTranslation();
  return (
    <ConfirmProvider
      defaultOptions={{
        title: t('admin.confirm.title'),
        confirmationText: t('admin.confirm.confirmation'),
        cancellationText: t('admin.confirm.cancel'),
      }}
    >
      {children}
    </ConfirmProvider>
  );
};

export const Providers: FC<PropsWithChildren<{initialLanguage: string}>> = ({initialLanguage, children}) => {
  const i18n = getI18n(initialLanguage);

  return (
    <I18nextProvider i18n={i18n}>
      <TrpcProvider>
        <ConfirmWithTranslation>
          {children}
          <ToastContainer limit={3} position='bottom-right' />
        </ConfirmWithTranslation>
      </TrpcProvider>
    </I18nextProvider>
  );
};
