'use client';

import {FC, Fragment, PropsWithChildren, PropsWithoutRef, SVGProps} from 'react';
import {Menu, Transition} from '@headlessui/react';
import {EnvelopeOpenIcon, ListBulletIcon, UserCircleIcon, UserGroupIcon} from '@heroicons/react/24/outline';
import {ChevronDownIcon} from '@heroicons/react/20/solid';
import clsx from 'clsx';
import {signOut, useSession} from 'next-auth/react';
import Link from 'next/link';
import * as React from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {LanguageChooser} from '~/components/language-chooser';
import {useTranslation} from 'react-i18next';

const SidebarNavLink: FC<PropsWithChildren<{Icon: FC<PropsWithoutRef<SVGProps<SVGSVGElement>>>; href: string}>> = ({
  href,
  Icon,
  children,
}) => {
  const pathname = usePathname();
  const active = pathname?.startsWith(href);

  return (
    <Link
      href={href}
      className={clsx(
        active ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white',
        'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6',
      )}
    >
      <Icon className='h-6 w-6 shrink-0' aria-hidden='true' />
      {children}
    </Link>
  );
};

export default function LoggedinLayout({children}: {children: React.ReactNode}) {
  const session = useSession();
  const router = useRouter();
  const {t} = useTranslation();

  return (
    <div className='min-h-0 w-full min-w-[50rem] overflow-y-auto bg-gray-50'>
      <div className='fixed inset-y-0 z-50 flex w-72 flex-col'>
        <div className='flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4'>
          <div className='flex h-16 shrink-0 items-center'></div>
          <nav className='flex flex-1 flex-col'>
            <ul role='list' className='flex flex-1 flex-col gap-y-7'>
              <li>
                <ul role='list' className='-mx-2 space-y-1'>
                  <li>
                    <SidebarNavLink Icon={EnvelopeOpenIcon} href='/admin/emails'>
                      {t('admin.sidebar.emails')}
                    </SidebarNavLink>
                  </li>
                  <li>
                    <SidebarNavLink Icon={ListBulletIcon} href='/admin/studies'>
                      {t('admin.sidebar.studies')}
                    </SidebarNavLink>
                  </li>
                  <li>
                    <SidebarNavLink Icon={UserGroupIcon} href='/admin/users'>
                      {t('admin.sidebar.users')}
                    </SidebarNavLink>
                  </li>
                </ul>
              </li>
            </ul>

            <div className='mt-auto text-white flex'>
              <div>
                <div className='text-sm'>{t('languages.language')}</div>
                <LanguageChooser />
              </div>
              <div className='ml-auto self-end text-gray-600 hover:text-gray-200'>
                {process.env.NEXT_PUBLIC_VERSION || 'dev'}
              </div>
            </div>
          </nav>
        </div>
      </div>

      <div className='pl-72'>
        <div className='sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8'>
          <div className='h-6 w-px bg-gray-900/10 lg:hidden' aria-hidden='true' />

          <div className='flex flex-1 gap-x-4 self-stretch lg:gap-x-6'>
            <div className='ml-auto flex items-center gap-x-4 lg:gap-x-6'>
              <Menu as='div' className='relative'>
                <Menu.Button className='-m-1.5 flex items-center p-1.5'>
                  <span className='sr-only'>{t('admin.userMenu.open')}</span>
                  <UserCircleIcon className='h-8 w-8 text-gray-400' aria-hidden='true' />
                  <span className='flex items-center'>
                    <span className='ml-4 text-sm font-semibold leading-6 text-gray-900' aria-hidden='true'>
                      {session.data?.user?.email}
                    </span>
                    <ChevronDownIcon className='ml-2 h-5 w-5 text-gray-400' aria-hidden='true' />
                  </span>
                </Menu.Button>
                <Transition
                  as={Fragment}
                  enter='transition ease-out duration-100'
                  enterFrom='transform opacity-0 scale-95'
                  enterTo='transform opacity-100 scale-100'
                  leave='transition ease-in duration-75'
                  leaveFrom='transform opacity-100 scale-100'
                  leaveTo='transform opacity-0 scale-95'
                >
                  <Menu.Items className='absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none'>
                    <Menu.Item>
                      {({active}) => (
                        <button
                          className={clsx(
                            active && 'bg-gray-50',
                            'block w-full px-3 py-1 text-sm leading-6 text-gray-900',
                          )}
                          onClick={async () => {
                            if (session.data?.user?.name) {
                              router.push(`admin/users/${session.data.user.name}`);
                            }
                          }}
                        >
                          {t('admin.userMenu.changePassword')}
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({active}) => (
                        <button
                          className={clsx(
                            active && 'bg-gray-50',
                            'block w-full px-3 py-1 text-sm leading-6 text-gray-900',
                          )}
                          onClick={async () => {
                            await signOut({
                              redirect: false,
                            });
                            router.push('/admin');
                          }}
                        >
                          {t('admin.userMenu.signOut')}
                        </button>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>
          </div>
        </div>

        <main className='py-10'>
          <div className='px-4 sm:px-6 lg:px-8'>{children}</div>
        </main>
      </div>
    </div>
  );
}
