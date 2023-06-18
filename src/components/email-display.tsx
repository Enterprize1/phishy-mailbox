import {Email} from '@prisma/client';
import clsx from 'clsx';
import debounce from 'lodash.debounce';
import {FC, SyntheticEvent, useCallback} from 'react';
import * as Dialog from '@radix-ui/react-dialog';

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
  if (!headers) return null;

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          className='self-center rounded-md border bg-gray-100 px-2 py-1 hover:bg-gray-200'
          onClick={() => onViewDetails?.()}
        >
          Details anzeigen
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-50 bg-black/40' />
        <Dialog.Content className='max-height-[85vh] fixed left-1/2 top-1/2 z-50 flex w-[90vw] max-w-[450px] -translate-x-1/2 -translate-y-1/2 flex-col bg-white p-6'>
          <Dialog.Title className='m-0 font-bold'>Nachrichtendetails</Dialog.Title>
          <Dialog.Description className='flex-shrink overflow-y-scroll whitespace-pre-wrap'>
            {headers}
          </Dialog.Description>
          <Dialog.Close asChild>
            <button className='mt-4 flex justify-center self-end rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'>
              Schließen
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default function EmailDisplay({
  email,
  className,
  onScroll,
  onClick,
  onHover,
  onViewDetails,
}: {
  email: Partial<Email>;
  className?: string;
  onScroll?: (scroll: number) => void;
  onClick?: (href: string, text: string) => void;
  onHover?: (href: string, text: string) => void;
  onViewDetails?: () => void;
}) {
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
          // TODO: Different URL
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

  return (
    <div className={clsx('flex flex-grow flex-col', className)}>
      <div className='bg-white px-4 py-2 font-bold shadow'>
        {email.subject}
        {!email.subject && <i className='font-normal'>Kein Titel</i>}
      </div>
      <div className='mb-4 mt-4 flex min-w-0 flex-grow flex-col bg-white p-4 shadow'>
        <div className='flex justify-between'>
          <div>
            <div>
              Von: {email.senderName}
              {email.senderName && email.senderMail && <>&lt;{email.senderMail}&gt;</>}
              {!email.senderName && email.senderMail && <>{email.senderMail}</>}
              {!email.senderName && !email.senderMail && <i className='font-normal'>Kein Absender</i>}
            </div>
            <div>An: Sie (postbox@example.de)</div>
          </div>
          <EmailDisplayDetails headers={email.headers} onViewDetails={onViewDetails} />
        </div>
        <iframe
          srcDoc={email.body}
          className='h-72 flex-grow'
          onLoad={didLoad}
          sandbox='allow-same-origin'
          {...{csp: "default-src 'none'; style-src 'unsafe-inline'; navigate-to 'none';"}}
        />
      </div>
    </div>
  );
}
