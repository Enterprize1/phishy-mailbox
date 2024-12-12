'use client';
import clsx from 'clsx';
import {FC, useCallback, useEffect, useMemo, useState} from 'react';
import {addMinutes, differenceInSeconds} from 'date-fns';
import {Email, ExternalImageMode, Folder, ParticipationEmail} from '@prisma/client';
import {trpc} from '~/utils/trpc';
import EmailDisplay, {EmailWithFunctionAsBody} from '~/components/email-display';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {twMerge} from 'tailwind-merge';
import Link from 'next/link';
import {
  EMailLinkClickEvent,
  EMailLinkHoverEvent,
  EMailScrolledEvent,
  EMailViewEvent,
  EMailViewExternalImagesEvent,
  EMailViewDetailsEvent,
} from '~/server/api/routers/participationEvents';
import {useTranslation} from 'react-i18next';
import {TimerMode} from '.prisma/client';
import DOMPurify from 'isomorphic-dompurify';

const NineDotsIcon = () => (
  <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'>
    <path
      fill='currentColor'
      d='M12 17.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm7 0a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm-14 0a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm7-7a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm7 0a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm-14 0a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm7-7a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm7 0a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm-14 0a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Z'
    ></path>
  </svg>
);

type EmailItem = ParticipationEmail & {email: EmailWithFunctionAsBody};
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
      className={twMerge(
        'flex w-full rounded py-2 pl-4 pr-1',
        isCurrentFolder && 'bg-blue-100',
        isOver && 'bg-blue-200',
      )}
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
}> = ({folders, setCurrentFolder, currentFolder}) => {
  const {t} = useTranslation(undefined, {keyPrefix: 'participants'});
  return (
    <div className='w-40 flex-shrink-0 pl-1 text-sm text-gray-700'>
      <div>{t('folders')}</div>
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
};

const SingleEmail: FC<{
  email: EmailItem;
  setAsCurrentEmail: () => void;
  isCurrentEmail: boolean;
  disableDragging: boolean;
}> = ({email, setAsCurrentEmail, isCurrentEmail, disableDragging}) => {
  const {attributes, listeners, setNodeRef, isDragging} = useDraggable({
    id: email.id,
    disabled: disableDragging,
  });

  return (
    <button
      type='button'
      onClick={setAsCurrentEmail}
      className={twMerge(
        'flex w-full flex-col border-l-4 px-2 py-2 text-left text-sm hover:!border-l-gray-400',
        isCurrentEmail ? 'bg-blue-100' : 'bg-gray-50 hover:bg-gray-100',
        isDragging && 'opacity-0',
      )}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
    >
      <div className='w-full truncate'>{email.email.senderName}</div>
      <div className={clsx('w-full truncate')}>{email.email.subject}</div>
    </button>
  );
};

const Emails: FC<{
  currentFolder: FolderWithEmails;
  currentEmail: EmailItem | undefined;
  setCurrentEmail: (e: EmailItem) => void;
  disableDragging: boolean;
}> = ({currentFolder, currentEmail, setCurrentEmail, disableDragging}) => {
  return (
    <div className='flex w-52 flex-shrink-0 flex-col bg-gray-50 shadow'>
      <div className='px-3 leading-loose'>{currentFolder.folder.name}</div>
      <div className='flex flex-grow flex-col divide-y divide-gray-300 overflow-y-auto overflow-x-hidden flex-[1_1_0px]'>
        {currentFolder.emails.map((e) => (
          <SingleEmail
            key={e.emailId}
            email={e}
            setAsCurrentEmail={() => setCurrentEmail(e)}
            isCurrentEmail={e.emailId === currentEmail?.emailId}
            disableDragging={disableDragging}
          />
        ))}
      </div>
    </div>
  );
};

const RemainingTimer: FC<{
  startedAt: Date | null;
  durationInMinutes: number | null;
  timerMode: TimerMode;
  canFinish: boolean;
  finish: () => void;
  isFinished: boolean;
}> = ({startedAt, durationInMinutes, timerMode, canFinish, finish, isFinished}) => {
  const shouldFinishAt = useMemo(
    () => (startedAt && durationInMinutes ? addMinutes(startedAt, durationInMinutes) : new Date()),
    [durationInMinutes, startedAt],
  );
  const [remainingText, setRemainingText] = useState<string | null>();
  const {t} = useTranslation(undefined, {keyPrefix: 'participants'});

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

    const timer = setInterval(update, 1000);
    update();

    return () => clearInterval(timer);
  }, [shouldFinishAt]);

  if (!remainingText || !startedAt || isFinished) {
    return null;
  }

  return (
    <>
      {canFinish && (
        <button
          type='button'
          className='mr-2 flex justify-center rounded-md bg-indigo-600 px-3 py-1 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 animate-highlight'
          onClick={finish}
        >
          {t('finish')}
        </button>
      )}
      {timerMode == TimerMode.VISIBLE && (
        <span className='ml-auto mr-4'>
          {t('remaining')} {remainingText}
        </span>
      )}
    </>
  );
};

const IsFinishedOverlay: FC<{onClick: () => void; endText?: string | null; link?: string}> = ({
  onClick,
  endText,
  link,
}) => {
  const {t} = useTranslation(undefined, {keyPrefix: 'participants'});

  return (
    <div className='z-60 fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75'>
      <div className='w-1/2 rounded-lg bg-white p-4'>
        <div className='text-2xl font-bold'>{t('finishedTitle')}</div>
        {endText && (
          <div
            dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(endText)}}
            className='mb-2 mt-2 whitespace-pre-wrap prose'
          />
        )}
        <div className='mt-4'>
          {link ? (
            <a
              href={link}
              onClick={onClick}
              className='text-blue-600 hover:text-blue-500'
              target='_blank'
              rel='noreferrer noopener'
            >
              {t('clickToContinue')}
            </a>
          ) : (
            <Link href='/' className='text-blue-600 hover:text-blue-500'>
              {t('backToStart')}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

const ConsentOverlay: FC<{onClick: () => void; text: string | null}> = ({onClick, text}) => {
  const {t} = useTranslation(undefined, {keyPrefix: 'participants'});
  const [consent, setConsent] = useState<'yes' | 'no' | null>(null);

  return (
    <div className='z-60 fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75'>
      <div className='w-1/2 rounded-lg bg-white p-4'>
        <div className='text-2xl font-bold'>{t('consent.title')}</div>
        {text && (
          <div className='mb-2 mt-2 overflow-y-auto h-[80vh]'>
            <div dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(text)}} className='whitespace-pre-wrap prose' />
            <form className='mt-4 flex gap-4'>
              <label className='flex items-center'>
                <input
                  type='radio'
                  name='consent'
                  value='yes'
                  className='mr-2 h-4 w-4 text-blue-600'
                  checked={consent === 'yes'}
                  onChange={() => setConsent('yes')}
                />
                {t('consent.yes')}
              </label>
              <label className='flex items-center'>
                <input
                  type='radio'
                  name='consent'
                  value='no'
                  className='mr-2 h-4 w-4 text-blue-600'
                  checked={consent === 'no'}
                  onChange={() => setConsent('no')}
                />
                {t('consent.no')}
              </label>
            </form>
          </div>
        )}

        <div className='mt-4 flex justify-between'>
          <button
            type='button'
            onClick={() => consent && onClick()}
            className='text-blue-600 hover:text-blue-500 disabled:text-gray-400'
            disabled={consent !== 'yes'}
          >
            {consent !== 'yes' ? t('consent.continueButtonText') : t('clickToContinue')}
          </button>
          <Link href='/' className='text-blue-600 hover:text-blue-500'>
            {t('backToStart')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default function Run({params: {code}}: {params: {code: string}}) {
  const {t} = useTranslation(undefined, {keyPrefix: 'participants'});
  const {data, refetch} = trpc.participation.get.useQuery(code);
  const startMutation = trpc.participation.start.useMutation();
  const giveConsentMutation = trpc.participation.giveConsent.useMutation();
  const moveEmailMutation = trpc.participation.moveEmail.useMutation();
  const finishMutation = trpc.participation.finish.useMutation();
  const clickStartLinkMutation = trpc.participation.clickStartLink.useMutation();
  const clickEndLinkMutation = trpc.participation.clickEndLink.useMutation();
  const trackEventMutation = trpc.participationEvent.track.useMutation();
  const [currentFolderId, setCurrentFolderId] = useState<string>();
  const [currentEmailId, setCurrentEmailId] = useState<string>();
  const [draggingEmail, setDraggingEmail] = useState<Email | EmailWithFunctionAsBody | undefined>(undefined);

  const setFolder = useCallback((folder: Folder) => {
    setCurrentFolderId(folder.id);
  }, []);

  const setEmail = useCallback(
    (email: EmailItem) => {
      setCurrentEmailId(email.id);

      trackEventMutation.mutate({
        participationId: data!.id,
        participationEmailId: email.id,
        event: {
          type: 'email-view',
        } as EMailViewEvent,
      });
    },
    [data, trackEventMutation],
  );

  const moveEmail = useCallback(
    async (dragEndEvent: DragEndEvent) => {
      setDraggingEmail(undefined);
      if (dragEndEvent.active.id === introductionEmailId && dragEndEvent.over) {
        await startMutation.mutateAsync(data!.id);
        await refetch();
      } else if (dragEndEvent.over) {
        await moveEmailMutation.mutateAsync({
          participationId: data!.id,
          emailId: dragEndEvent.active.id.toString(),
          folderId: dragEndEvent.over.id.toString(),
        });
        await refetch();
      }
    },
    [moveEmailMutation, data, refetch, startMutation],
  );

  const finish = useCallback(async () => {
    await finishMutation.mutateAsync(data!.id);
    await refetch();
  }, [finishMutation, data, refetch]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const requiresStartLinkClick = !!data?.study.startLinkTemplate;
  const didClickStartLink = !!data?.startLinkClickedAt;

  const onConsentGiven = useCallback(async () => {
    await giveConsentMutation.mutateAsync(data!.id);
    refetch();
  }, [giveConsentMutation, data, refetch]);

  const onEndLinkClicked = useCallback(async () => {
    await clickEndLinkMutation.mutateAsync(data!.id);
    refetch();
  }, [clickEndLinkMutation, data, refetch]);

  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const checkFinished = () => {
      const now = new Date();
      const finished =
        !!data &&
        !!data.startedAt &&
        (!!data.finishedAt ||
          (data.study.timerMode !== TimerMode.DISABLED &&
            now > addMinutes(data.startedAt, data.study.durationInMinutes ?? 0)));
      setIsFinished(finished);
    };

    checkFinished();
    const timer = setInterval(checkFinished, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [data]);

  const consentNotGiven = !!data?.study.consentRequired && !data?.consentGivenAt;

  if (!data) {
    return null;
  }

  const emails: EmailItem[] = data.startedAt
    ? data.emails.map((email) => ({
        ...email,
        email: {
          ...email.email,
          body: null,
        },
      }))
    : [
        {
          id: introductionEmailId,
          emailId: introductionEmailId,
          folderId: null,
          participationId: data.id,
          email: {
            id: introductionEmailId,
            senderMail: '',
            senderName: '',
            subject: t('introductionEmail.subject'),
            body: () => {
              const startLink = data.study.startLinkTemplate?.replace('{code}', data.code);

              return (
                <div className='p-4 whitespace-pre-line overflow-y-auto min-h-0 flex-[1_1_0px]'>
                  <div
                    dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(data.study.startText)}}
                    className='whitespace-pre-wrap prose'
                  />
                  <br />
                  <br />
                  {requiresStartLinkClick && !didClickStartLink ? (
                    <a
                      href={startLink}
                      target='_blank'
                      rel='noreferrer noopener'
                      className='w-max rounded bg-blue-500 px-2 py-1 text-white hover:bg-blue-600'
                      onClick={async () => {
                        await clickStartLinkMutation.mutateAsync(data.id);
                        await refetch();
                      }}
                    >
                      {t('introductionEmail.clickToStart')}
                    </a>
                  ) : (
                    t('introductionEmail.dragEmailToStart')
                  )}
                </div>
              );
            },
            allowExternalImages: false,
            backofficeIdentifier: '',
            headers: '',
          },
        },
      ];

  const onDragStart = (event: DragStartEvent) => {
    setDraggingEmail(emails.find((e) => e.id === event.active.id)?.email);
  };

  const foldersWithEmails = [
    {
      folder: {
        id: 'inbox',
        name: 'Inbox',
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

  return (
    <DndContext onDragStart={onDragStart} onDragEnd={moveEmail} sensors={sensors}>
      {consentNotGiven && <ConsentOverlay onClick={onConsentGiven} text={data.study.consentText} />}
      {isFinished && (
        <IsFinishedOverlay
          onClick={onEndLinkClicked}
          link={data.study.endLinkTemplate?.replace('{code}', data.code)}
          endText={data.study.endText}
        />
      )}
      <main className='flex h-screen w-full flex-col bg-gray-100'>
        <div className='flex h-12 items-center bg-blue-600 text-white'>
          <button type='button' className='flex h-12 w-12 items-center justify-center bg-blue-700'>
            <NineDotsIcon />
          </button>
          <span className='flex flex-grow items-center px-4 font-bold'>{t('title')}</span>
          <RemainingTimer
            startedAt={data.startedAt}
            durationInMinutes={data.study.durationInMinutes}
            timerMode={data.study.timerMode}
            canFinish={canFinish}
            finish={finish}
            isFinished={isFinished}
          />
        </div>
        <div className='flex flex-grow'>
          <div className='w-12 flex-shrink-0 bg-gray-200'></div>
          <div className='mr-4 mt-4 flex flex-grow gap-4'>
            <Folders folders={foldersWithEmails} setCurrentFolder={setFolder} currentFolder={currentFolder} />
            <Emails
              currentFolder={currentFolder}
              setCurrentEmail={setEmail}
              currentEmail={currentEmail}
              disableDragging={requiresStartLinkClick && !didClickStartLink}
            />
            <div className='flex flex-grow flex-col'>
              {currentEmail && (
                <EmailDisplay
                  email={currentEmail.email}
                  studyId={data.study.id}
                  studyExternalImageMode={
                    currentEmail.email.allowExternalImages ? data.study.externalImageMode : ExternalImageMode.HIDE
                  }
                  onScroll={(p) => {
                    trackEventMutation.mutate({
                      participationId: data.id,
                      participationEmailId: currentEmail.id,
                      event: {
                        type: 'email-scrolled',
                        scrollPosition: p,
                      } as EMailScrolledEvent,
                    });
                  }}
                  onClick={(href, text) => {
                    trackEventMutation.mutate({
                      participationId: data.id,
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
                      participationId: data.id,
                      participationEmailId: currentEmail.id,
                      event: {
                        type: 'email-link-hover',
                        url: href,
                        linkText: text,
                      } as EMailLinkHoverEvent,
                    });
                  }}
                  onViewDetails={() => {
                    trackEventMutation.mutate({
                      participationId: data.id,
                      participationEmailId: currentEmail.id,
                      event: {
                        type: 'email-details-view',
                      } as EMailViewDetailsEvent,
                    });
                  }}
                  onViewExternalImages={() => {
                    trackEventMutation.mutate({
                      participationId: data.id,
                      participationEmailId: currentEmail.id,
                      event: {
                        type: 'email-external-images-view',
                      } as EMailViewExternalImagesEvent,
                    });
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </main>
      <DragOverlay dropAnimation={null}>
        {draggingEmail && (
          <div className='flex w-full flex-col border-l-4 px-2 py-2 text-left text-sm hover:!border-l-gray-400 opacity-70 bg-blue-100'>
            <div className='w-full truncate'>{draggingEmail.senderName}</div>
            <div className='w-full truncate'>{draggingEmail.subject}</div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
