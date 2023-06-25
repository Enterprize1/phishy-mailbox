'use client';
import '../styles/globals.css';
import {trpc} from '~/utils/trpc';
import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: true,
    load: 'languageOnly',

    interpolation: {
      escapeValue: false,
    },
  });

function AppLayout({children}: {children: React.ReactNode}) {
  return (
    <html className='h-full bg-white'>
      <head>
        <title>Mailbox</title>
      </head>
      <body className='h-full bg-gray-50'>{children}</body>
    </html>
  );
}

export default trpc.withTRPC(AppLayout);
