import {Email, ExternalImageMode} from '@prisma/client';
import clsx from 'clsx';
import debounce from 'lodash.debounce';
import {FC, ReactNode, SyntheticEvent, useCallback, useMemo, useState} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {useTranslation} from 'react-i18next';
import {InformationCircleIcon} from '@heroicons/react/24/solid';

export type EmailWithFunctionAsBody = Omit<Email, 'body'> & {body: (() => ReactNode) | Email['body'] | null};

function getParentAnchor(element: HTMLElement | null, body: HTMLElement | undefined): HTMLAnchorElement | null {
  while (element && element !== body) {
    if (element.tagName === 'A') {
      return element as HTMLAnchorElement;
    }

    element = element.parentElement;
  }

  return null;
}

const EmailDisplayDetails: FC<{headers?: string; onViewDetails?: () => void}> = ({headers, onViewDetails}) => {
  const {t} = useTranslation(undefined, {keyPrefix: 'components.emailDisplay.details'});
  if (!headers) return null;

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          className='self-center rounded-sm border bg-gray-100 px-2 py-1 hover:bg-gray-200'
          onClick={() => onViewDetails?.()}
        >
          {t('showDetails')}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-50 bg-black/40' />
        <Dialog.Content className='fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] max-w-[85vw] -translate-x-1/2 -translate-y-1/2 flex-col bg-white p-6'>
          <Dialog.Title className='m-0 font-bold'>{t('messageDetails')}</Dialog.Title>
          <Dialog.Description className='flex-shrink overflow-y-scroll whitespace-pre-wrap'>
            {headers}
          </Dialog.Description>
          <Dialog.Close asChild>
            <button className='mt-4 flex justify-center self-end rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'>
              {t('close')}
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default function EmailDisplay({
  email,
  studyId,
  studyExternalImageMode,
  className,
  onScroll,
  onClick,
  onHover,
  onViewDetails,
  onViewExternalImages,
}: {
  email: Partial<EmailWithFunctionAsBody>;
  studyId: string;
  studyExternalImageMode: ExternalImageMode;
  className?: string;
  onScroll?: (scroll: number) => void;
  onClick?: (href: string, text: string) => void;
  onHover?: (href: string, text: string) => void;
  onViewDetails?: () => void;
  onViewExternalImages?: () => void;
}) {
  const {t} = useTranslation(undefined, {keyPrefix: 'components.emailDisplay'});
  const didLoad = useCallback(
    (loadEvent: SyntheticEvent<HTMLIFrameElement>) => {
      const iframe = loadEvent.target as HTMLIFrameElement;

      const debouncedScroll = debounce(() => {
        if (iframe.contentWindow && iframe.contentDocument) {
          const rawPercentage =
            iframe.contentWindow.scrollY /
            (iframe.contentDocument.body.scrollHeight - iframe.contentWindow.innerHeight);

          onScroll?.(Math.min(Math.max(rawPercentage, 0), 1));
        }
      }, 1000);

      iframe.contentWindow?.addEventListener('scroll', debouncedScroll, {passive: true});

      const onClickListener = (e: MouseEvent) => {
        e.preventDefault();

        const anchor = getParentAnchor(e.target as HTMLElement | null, iframe.contentDocument?.body);
        if (anchor) {
          window.open('/404', '_blank');
          onClick?.(anchor.href, anchor.innerText);
        }
      };

      iframe.contentDocument?.addEventListener('click', onClickListener, true);

      let hoverElement: HTMLAnchorElement | null = null;
      let hoverNotifyTimeout: ReturnType<typeof setTimeout> | null = null;

      iframe.contentDocument?.addEventListener(
        'mouseenter',
        (e: MouseEvent) => {
          const anchor = getParentAnchor(e.target as HTMLElement | null, iframe.contentDocument?.body);
          if (anchor) {
            hoverElement = anchor;
            if (hoverNotifyTimeout) {
              clearTimeout(hoverNotifyTimeout);
            }

            hoverNotifyTimeout = setTimeout(() => {
              onHover?.(anchor.href, anchor.innerText);
            }, 500);
          }
        },
        true,
      );

      iframe.contentDocument?.addEventListener(
        'mouseleave',
        (e: MouseEvent) => {
          const anchor = getParentAnchor(e.target as HTMLElement | null, iframe.contentDocument?.body);
          if (anchor === hoverElement && hoverNotifyTimeout) {
            clearTimeout(hoverNotifyTimeout);
            hoverNotifyTimeout = null;
          }
        },
        true,
      );

      for (const eventName of ['auxclick', 'dblclick', 'keydown', 'keyup', 'keypress', 'contextmenu']) {
        iframe.contentDocument?.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();
        });
      }
    },
    [onClick, onHover, onScroll],
  );

  const [showExternalImages, setShowExternalImages] = useState(studyExternalImageMode === ExternalImageMode.SHOW);

  const emailElement = useMemo(() => {
    if (email.body === null) {
      return (
        <iframe
          src={'/email/' + studyId + '/' + email.id + (showExternalImages ? '?showExternalImages=true' : '')}
          className='h-72 flex-grow'
          onLoad={didLoad}
          sandbox='allow-same-origin'
          {...{csp: "default-src 'none'; style-src 'unsafe-inline'; navigate-to 'none'; img-src https: data:;"}}
        />
      );
    }

    if (typeof email.body === 'function') {
      return email.body();
    }

    return (
      <iframe
        srcDoc={email.body}
        className='h-72 flex-grow'
        onLoad={didLoad}
        sandbox='allow-same-origin'
        {...{
          csp:
            "default-src 'none'; style-src 'unsafe-inline'; navigate-to 'none';" +
            (showExternalImages ? ' img-src https: data:;' : ''),
        }}
      />
    );
  }, [email, studyId, didLoad, showExternalImages]);

  return (
    <div className={clsx('flex flex-grow flex-col', className)}>
      <div className='bg-white px-4 py-2 font-bold shadow'>
        {email.subject}
        {!email.subject && <i className='font-normal'>{t('noTitle')}</i>}
      </div>
      <div className='mb-4 mt-4 flex min-w-0 flex-grow flex-col bg-white shadow'>
        <div className='flex justify-between p-4'>
          <div>
            <div>
              {t('from')} {email.senderName}
              {email.senderName && email.senderMail && <>&lt;{email.senderMail}&gt;</>}
              {!email.senderName && email.senderMail && <>{email.senderMail}</>}
              {!email.senderName && !email.senderMail && <i className='font-normal'>{t('noSender')}</i>}
            </div>
            <div>{t('to')}</div>
          </div>
          <EmailDisplayDetails headers={email.headers} onViewDetails={onViewDetails} />
        </div>
        {studyExternalImageMode === ExternalImageMode.ASK && !showExternalImages && (
          <div className='flex gap-4 bg-gray-50 px-4 py-2 items-center border-y'>
            <InformationCircleIcon className='size-4 text-gray-500' />
            <div>{t('imagesBlocked')}</div>
            <button
              type='button'
              className='bg-white rounded-sm border px-2 py-1 ml-auto'
              onClick={() => {
                onViewExternalImages?.();
                setShowExternalImages(true);
              }}
            >
              {t('showImages')}
            </button>
          </div>
        )}
        <div className='flex flex-col flex-grow'>{emailElement}</div>
      </div>
    </div>
  );
}
