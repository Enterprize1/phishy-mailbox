import {Email} from '@prisma/client';
import clsx from 'clsx';
import debounce from 'lodash.debounce';
import {SyntheticEvent, useCallback} from 'react';

function getParentAnchor(element: HTMLElement | null, body: HTMLElement | undefined): HTMLAnchorElement | null {
  while (element && element !== body) {
    if (element.tagName === 'A') {
      return element as HTMLAnchorElement;
    }

    element = element.parentElement;
  }

  return null;
}

export default function EmailDisplay({
  email,
  className,
  onScroll,
  onClick,
  onHover,
}: {
  email: Partial<Email>;
  className?: string;
  onScroll?: (scroll: number) => void;
  onClick?: (href: string, text: string) => void;
  onHover?: (href: string, text: string) => void;
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
        <div>
          Von: {email.senderName}
          {email.senderName && email.senderMail && <>&lt;{email.senderMail}&gt;</>}
          {!email.senderName && email.senderMail && <>{email.senderMail}</>}
          {!email.senderName && !email.senderMail && <i className='font-normal'>Kein Absender</i>}
        </div>
        <div>An: Sie (postbox@example.de)</div>
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
