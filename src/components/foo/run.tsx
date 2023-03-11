export {};

/*
import {Email, Folder, folders, useStore} from '../components/store';
import clsx from 'clsx';
import {useEffect, useMemo, useState} from 'react';
import {differenceInSeconds} from 'date-fns';
import {motion} from 'framer-motion';

const NineDotsIcon = () => (
  <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'>
    <path
      fill='currentColor'
      d='M12 17.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm7 0a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm-14 0a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm7-7a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm7 0a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm-14 0a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm7-7a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm7 0a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm-14 0a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Z'
    ></path>
  </svg>
);

function SingleFolder({folder}: {folder: Folder}) {
  const currentFolder = useStore((s) => s.currentFolder);
  const setCurrentFolder = useStore((s) => s.setCurrentFolder);
  const emailCount = useStore((s) => s.emails.filter((e) => e.folder == folder).length);

  return (
    <button
      type='button'
      className={clsx('flex w-full rounded pl-4 pr-1', folder === currentFolder && 'bg-blue-100')}
      onClick={() => setCurrentFolder(folder)}
    >
      <span>{folder.name}</span> <span className='ml-auto'>{emailCount}</span>
    </button>
  );
}

function Folders() {
  return (
    <div className='w-40 flex-shrink-0 pl-1 text-sm text-gray-700'>
      <div>Ordner</div>
      {folders.map((f) => (
        <SingleFolder key={f.name} folder={f} />
      ))}
    </div>
  );
}

function SingleEmail({email}: {email: Email}) {
  const currentEmail = useStore((s) => s.currentEmail);
  const setCurrentEmail = useStore((s) => s.setCurrentEmail);

  const truncatedFrom = useMemo(() => {
    return email.from.replace(/<.*>/, '');
  }, [email.from]);

  return (
    <motion.button
      drag
      dragConstraints={{
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      }}
      dragTransition={{bounceStiffness: 600, bounceDamping: 20}}
      dragElastic={1}
      type='button'
      onClick={() => setCurrentEmail(email)}
      className={clsx(
        'flex w-full flex-col border-l-4 px-2 py-2 text-left text-sm',
        currentEmail === email ? 'bg-blue-100' : 'bg-gray-50',
        !email.read ? '!border-l-blue-600 font-bold' : '!border-l-transparent',
      )}
    >
      <div className='w-full truncate'>{truncatedFrom}</div>
      <div className={clsx('w-full truncate', !email.read && 'text-blue-700')}>{email.title}</div>
    </motion.button>
  );
}

function Emails() {
  const currentFolder = useStore((s) => s.currentFolder);
  const emails = useStore((s) => s.emails.filter((e) => e.folder === s.currentFolder));

  return (
    <div className='flex w-52 flex-shrink-0 flex-col bg-gray-50 shadow'>
      <div className='px-3 leading-loose'>{currentFolder.name}</div>
      <div className='flex flex-grow flex-col divide-y divide-gray-300'>
        {emails.map((e) => (
          <SingleEmail key={e.title} email={e} />
        ))}
      </div>
    </div>
  );
}

function CurrentEmailDisplay() {
  const currentEmail = useStore((s) => s.currentEmail);

  return (
    <div className='flex flex-grow flex-col'>
      {!currentEmail && 'No current'}
      {currentEmail && <div className='bg-white px-4 py-2 font-bold shadow'>{currentEmail.title}</div>}
      {currentEmail && (
        <div className='mt-4 mb-4 min-w-0 flex-grow bg-white p-4 shadow'>
          {typeof currentEmail.text == 'string' ? currentEmail.text : <currentEmail.text />}
        </div>
      )}
    </div>
  );
}

function RemainingTimer() {
  const shouldFinishAt = useStore((s) => s.shouldFinishAt);
  const [remainingText, setRemainingText] = useState<string>();

  useEffect(() => {
    const update = () => {
      if (!shouldFinishAt) {
        setRemainingText(null);
        return;
      }

      const secondsDiff = differenceInSeconds(shouldFinishAt, new Date());

      let minutes = Math.floor(secondsDiff / 60).toString();
      if (minutes.length == 1) {
        minutes = '0' + minutes;
      }

      let seconds = (secondsDiff % 60).toString();
      if (seconds.length == 1) {
        seconds = '0' + seconds;
      }

      setRemainingText(`${minutes}:${seconds}`);
    };

    const t = setInterval(update, 1000);
    update();

    return () => clearInterval(t);
  }, [shouldFinishAt]);

  if (!remainingText) {
    return null;
  }

  return <span className='ml-auto mr-4'>Verbleibend {remainingText}</span>;
}

export default function Run() {
  return (
    <main className='flex h-screen flex-col bg-gray-100'>
      <div className='flex h-12 items-center bg-blue-600 text-white'>
        <button type='button' className='flex h-12 w-12 items-center justify-center bg-blue-700'>
          <NineDotsIcon />
        </button>
        <span className='flex flex-grow items-center px-4 font-bold'>Mailbox</span>
        <RemainingTimer />
      </div>
      <div className='flex flex-grow'>
        <div className='w-12 flex-shrink-0 bg-gray-200'></div>
        <div className='mt-4 flex flex-grow gap-4'>
          <Folders />
          <Emails />
          <CurrentEmailDisplay />
        </div>
      </div>
    </main>
  );
}
*/
