'use client';
import '../styles/globals.css';
import {trpc} from '~/utils/trpc';

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
