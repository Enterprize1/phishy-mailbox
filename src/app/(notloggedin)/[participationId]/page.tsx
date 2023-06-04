'use client';
import clsx from 'clsx';
import {FC, useCallback, useEffect, useMemo, useState} from 'react';
import {addMinutes, differenceInSeconds} from 'date-fns';
import {Email, Folder, ParticipationEmail} from '@prisma/client';
import {trpc} from '../../../utils/trpc';
import EmailDisplay from '~/components/email-display';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {CSS} from '@dnd-kit/utilities';
import {twMerge} from 'tailwind-merge';
import Link from 'next/link';
import {
  EMailLinkClickEvent,
  EMailLinkHoverEvent,
  EMailScrolledEvent,
  EMailViewEvent,
} from '~/server/api/routers/participationEvents';

const NineDotsIcon = () => (
  <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'>
    <path
      fill='currentColor'
      d='M12 17.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm7 0a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm-14 0a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm7-7a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm7 0a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm-14 0a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm7-7a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm7 0a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm-14 0a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Z'
    ></path>
  </svg>
);

type EmailItem = ParticipationEmail & {email: Email};
type FolderWithEmails = {folder: Folder; emails: EmailItem[]};
const introductionEmailId = 'introduction';

const SingleFolder: FC<{
  folder: FolderWithEmails;
  setAsCurrentFolder: () => void;
  isCurrentFolder: boolean;
}> = ({folder, setAsCurrentFolder, isCurrentFolder}) => {
  const {isOver, setNodeRef} = useDroppable({
    id: folder.folder.id,
  });

  return (
    <button
      type='button'
      className={twMerge('flex w-full rounded pl-4 pr-1', isCurrentFolder && 'bg-blue-100', isOver && 'bg-blue-200')}
      onClick={setAsCurrentFolder}
      ref={setNodeRef}
    >
      <span>{folder.folder.name}</span> <span className='ml-auto'>{folder.emails.length}</span>
    </button>
  );
};

const Folders: FC<{
  folders: FolderWithEmails[];
  setCurrentFolder: (f: Folder) => void;
  currentFolder: FolderWithEmails;
}> = ({folders, setCurrentFolder, currentFolder}) => (
  <div className='w-40 flex-shrink-0 pl-1 text-sm text-gray-700'>
    <div>Ordner</div>
    {folders.map((f) => (
      <SingleFolder
        key={f.folder.id}
        folder={f}
        setAsCurrentFolder={() => setCurrentFolder(f.folder)}
        isCurrentFolder={f.folder.id === currentFolder.folder.id}
      />
    ))}
  </div>
);

const SingleEmail: FC<{email: EmailItem; setAsCurrentEmail: () => void; isCurrentEmail: boolean}> = ({
  email,
  setAsCurrentEmail,
  isCurrentEmail,
}) => {
  const {attributes, listeners, setNodeRef, transform} = useDraggable({
    id: email.id,
  });

  const style = {
    // Outputs `translate3d(x, y, 0)`
    transform: CSS.Translate.toString(transform),
  };

  return (
    <button
      type='button'
      onClick={setAsCurrentEmail}
      className={clsx(
        'flex w-full flex-col border-l-4 px-2 py-2 text-left text-sm',
        isCurrentEmail ? 'bg-blue-100' : 'bg-gray-50',
        !email.openedAt ? '!border-l-blue-600 font-bold' : '!border-l-transparent',
      )}
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
    >
      <div className='w-full truncate'>{email.email.senderName}</div>
      <div className={clsx('w-full truncate', !email.openedAt && 'text-blue-700')}>{email.email.subject}</div>
    </button>
  );
};

const Emails: FC<{
  currentFolder: FolderWithEmails;
  currentEmail: EmailItem | undefined;
  setCurrentEmail: (e: EmailItem) => void;
}> = ({currentFolder, currentEmail, setCurrentEmail}) => {
  return (
    <div className='flex w-52 flex-shrink-0 flex-col bg-gray-50 shadow'>
      <div className='px-3 leading-loose'>{currentFolder.folder.name}</div>
      <div className='flex flex-grow flex-col divide-y divide-gray-300'>
        {currentFolder.emails.map((e) => (
          <SingleEmail
            key={e.emailId}
            email={e}
            setAsCurrentEmail={() => setCurrentEmail(e)}
            isCurrentEmail={e.emailId === currentEmail?.emailId}
          />
        ))}
      </div>
    </div>
  );
};

const RemainingTimer: FC<{
  startedAt: Date | null;
  durationInMinutes: number;
  canFinish: boolean;
  finish: () => void;
}> = ({startedAt, durationInMinutes, canFinish, finish}) => {
  const shouldFinishAt = useMemo(
    () => (startedAt ? addMinutes(startedAt, durationInMinutes) : new Date()),
    [durationInMinutes, startedAt],
  ); // useStore((s) => s.shouldFinishAt);
  const [remainingText, setRemainingText] = useState<string | null>();

  useEffect(() => {
    const update = () => {
      if (!shouldFinishAt) {
        setRemainingText(null);
        return;
      }

      const secondsDiff = differenceInSeconds(shouldFinishAt, new Date());

      if (secondsDiff <= 0) {
        setRemainingText(null);
        return;
      }

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

  if (!remainingText || !startedAt) {
    return null;
  }

  return (
    <>
      {canFinish && (
        <button
          type='button'
          className='mr-2 flex justify-center rounded-md bg-indigo-600 px-3 py-1 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500'
          onClick={finish}
        >
          Abschliessen
        </button>
      )}
      <span className='ml-auto mr-4'>Verbleibend {remainingText}</span>
    </>
  );
};

const IsFinishedOverlay = () => {
  return (
    <div className='absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75'>
      <div className='w-1/2 rounded-lg bg-white p-4'>
        <div className='text-2xl font-bold'>Sie haben es geschafft!</div>
        <div className='mt-4'>
          <Link href='/' className='text-blue-600 hover:text-blue-500'>
            Zurück zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
};

export default function Run({params: {participationId}}: {params: {participationId: string}}) {
  const {data, refetch} = trpc.participation.get.useQuery(participationId);
  const startMutation = trpc.participation.start.useMutation();
  const moveEmailMutation = trpc.participation.moveEmail.useMutation();
  const finishMutation = trpc.participation.finish.useMutation();
  const trackEventMutation = trpc.participationEvent.track.useMutation();
  const [currentFolderId, setCurrentFolderId] = useState<string>();
  const [currentEmailId, setCurrentEmailId] = useState<string>();

  const setFolder = useCallback((folder: Folder) => {
    setCurrentFolderId(folder.id);
  }, []);

  const setEmail = useCallback(
    (email: EmailItem) => {
      setCurrentEmailId(email.id);

      trackEventMutation.mutate({
        participationId: participationId,
        participationEmailId: email.id,
        event: {
          type: 'email-view',
        } as EMailViewEvent,
      });
    },
    [participationId, trackEventMutation],
  );

  const moveEmail = useCallback(
    async (dragEndEvent: DragEndEvent) => {
      if (dragEndEvent.active.id === introductionEmailId && dragEndEvent.over) {
        await startMutation.mutateAsync(participationId);
        await refetch();
      } else if (dragEndEvent.over) {
        await moveEmailMutation.mutateAsync({
          participationId: participationId,
          emailId: dragEndEvent.active.id.toString(),
          folderId: dragEndEvent.over.id.toString(),
        });
        await refetch();
      }
    },
    [moveEmailMutation, participationId, refetch, startMutation],
  );

  const finish = useCallback(async () => {
    await finishMutation.mutateAsync(participationId);
    await refetch();
  }, [finishMutation, participationId, refetch]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  if (!data) {
    return null;
  }

  const emails: EmailItem[] = data.startedAt
    ? data.emails
    : [
        {
          id: introductionEmailId,
          emailId: introductionEmailId,
          folderId: null,
          participationId: data.id,
          openedAt: new Date(),
          email: {
            id: introductionEmailId,
            senderMail: '',
            senderName: '',
            subject: 'Intro',
            body: data.study.introductionText + '<br /><br /> Bewegen Sie zum Start die E-Mail in einen der Ordner.',
            backofficeIdentifier: '',
          },
        },
      ];

  const foldersWithEmails = [
    {
      folder: {
        id: 'inbox',
        name: 'Inbox',
        isPhishing: false,
        order: -1,
        studyId: data.study.id,
      },
      emails: emails.filter((e) => e.folderId === null),
    },
  ].concat(
    data.study.folder.map((f) => {
      return {
        folder: f,
        emails: emails.filter((e) => e.folderId === f.id),
      };
    }),
  );

  const currentFolder = foldersWithEmails.find((f) => f.folder.id === currentFolderId) ?? foldersWithEmails[0];
  const currentEmail = data.startedAt ? emails.find((e) => e.id === currentEmailId) : foldersWithEmails[0].emails[0];
  const canFinish = !!data.startedAt && emails.every((e) => e.folderId !== null);
  const isFinished =
    !!data.startedAt && (!!data.finishedAt || new Date() > addMinutes(data.startedAt, data.study.durationInMinutes));

  return (
    <DndContext onDragEnd={moveEmail} sensors={sensors}>
      {isFinished && <IsFinishedOverlay />}
      <main className='flex h-screen w-full flex-col bg-gray-100'>
        <div className='flex h-12 items-center bg-blue-600 text-white'>
          <button type='button' className='flex h-12 w-12 items-center justify-center bg-blue-700'>
            <NineDotsIcon />
          </button>
          <span className='flex flex-grow items-center px-4 font-bold'>Mailbox</span>
          <RemainingTimer
            startedAt={data.startedAt}
            durationInMinutes={data.study.durationInMinutes}
            canFinish={canFinish}
            finish={finish}
          />
        </div>
        <div className='flex flex-grow'>
          <div className='w-12 flex-shrink-0 bg-gray-200'></div>
          <div className='mt-4 flex flex-grow gap-4'>
            <Folders folders={foldersWithEmails} setCurrentFolder={setFolder} currentFolder={currentFolder} />
            <Emails currentFolder={currentFolder} setCurrentEmail={setEmail} currentEmail={currentEmail} />
            <div className='flex flex-grow flex-col'>
              {currentEmail && (
                <EmailDisplay
                  email={currentEmail.email}
                  onScroll={(p) => {
                    trackEventMutation.mutate({
                      participationId: participationId,
                      participationEmailId: currentEmail.id,
                      event: {
                        type: 'email-scrolled',
                        scrollPosition: p,
                      } as EMailScrolledEvent,
                    });
                  }}
                  onClick={(href, text) => {
                    trackEventMutation.mutate({
                      participationId: participationId,
                      participationEmailId: currentEmail.id,
                      event: {
                        type: 'email-link-click',
                        url: href,
                        linkText: text,
                      } as EMailLinkClickEvent,
                    });
                  }}
                  onHover={(href, text) => {
                    trackEventMutation.mutate({
                      participationId: participationId,
                      participationEmailId: currentEmail.id,
                      event: {
                        type: 'email-link-hover',
                        url: href,
                        linkText: text,
                      } as EMailLinkHoverEvent,
                    });
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </DndContext>
  );
}
