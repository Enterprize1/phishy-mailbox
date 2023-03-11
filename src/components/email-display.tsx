import {Email} from '@prisma/client';
import clsx from 'clsx';

export default function EmailDisplay({email, className}: {email: Partial<Email>; className?: string}) {
  return (
    <div className={clsx('flex flex-grow flex-col', className)}>
      <div className='bg-white px-4 py-2 font-bold shadow'>
        {email.subject}
        {!email.subject && <i className='font-normal'>Kein Titel</i>}
      </div>
      <div className='mb-4 mt-4 min-w-0 flex-grow bg-white p-4 shadow'>
        <div className='flex flex-col'>
          <div>
            Von: {email.senderName}
            {email.senderName && email.senderMail && <>&lt;{email.senderMail}&gt;</>}
            {!email.senderName && email.senderMail && <>{email.senderMail}</>}
            {!email.senderName && !email.senderMail && <i className='font-normal'>Kein Absender</i>}
          </div>
          <div>An: Sie (postbox@example.de)</div>
          {/*TODO: Secure Display, maybe CSP?*/}
          <iframe srcDoc={email.body} className='h-72' />
        </div>
      </div>
    </div>
  );
}
