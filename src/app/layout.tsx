import '../styles/globals.css';
import {cookies, headers} from 'next/headers';
import {PropsWithChildren} from 'react';
import {Providers} from './providers';

const SUPPORTED_LANGUAGES = ['de', 'en'] as const;
const FALLBACK_LANGUAGE = 'en';

// Resolve the language on the server so the initial HTML is already in the right
// language. We honour the persisted `i18next` cookie first (set by the language
// chooser / detector on the client), then fall back to the browser's
// Accept-Language header, and finally to English.
const resolveLanguage = (cookieValue: string | undefined, acceptLanguage: string): string => {
  const candidates = [cookieValue, ...acceptLanguage.split(',').map((part) => part.split(';')[0])];
  for (const candidate of candidates) {
    const language = candidate?.trim().split('-')[0].toLowerCase();
    if (language && (SUPPORTED_LANGUAGES as readonly string[]).includes(language)) {
      return language;
    }
  }
  return FALLBACK_LANGUAGE;
};

export default async function AppLayout({children}: PropsWithChildren) {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const language = resolveLanguage(cookieStore.get('i18next')?.value, headerStore.get('accept-language') ?? '');

  return (
    <html lang={language} className='h-full bg-white'>
      <head>
        <title>Mailbox</title>
      </head>
      <body className='h-full bg-gray-50'>
        <Providers initialLanguage={language}>{children}</Providers>
      </body>
    </html>
  );
}
