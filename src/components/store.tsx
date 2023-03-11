export {};

/*
import {create} from 'zustand';
import produce from 'immer';
import {ReactElement} from 'react';
import {addMinutes} from 'date-fns';

export type Phase = 'explanation' | 'run';

export interface Folder {
  name: string;
}

export const folders: ReadonlyArray<Folder> = [
  {name: 'Eingang'},
  {name: 'Jetzt'},
  {name: 'Spaeter'},
  {name: 'Junk'},
] as const;

export interface Email {
  title: string;
  text: string | (() => ReactElement);
  from: string;
  folder: Folder;
  read?: true;
}

export const explanationEmail: Email = {
  title: 'Willkommen',
  text: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks,@typescript-eslint/no-use-before-define
    const tempStart = useStore((s) => s.tempStart);

    return (
      <div>
        <p>Willkommen</p>
        <p>Sie sind Her Mueller...</p>
        <p className='mt-8'>Zum Start verschieben Sie diese E-Mail in einen Ordner.</p>
        <button type='button' className='rounded-xl bg-blue-200 px-4 py-2 shadow' onClick={tempStart}>
          Temp: Start
        </button>
      </div>
    );
  },
  from: '',
  folder: folders[0],
};

export const emails: Email[] = [
  {
    title: 'Hello',
    text: 'Gute E-Mail, die jetzt beantwortet werden soll',
    from: 'Ein Absender <mail@example.com>',
    folder: folders[0],
  },
  {
    title: 'Phishing E-Mail',
    text: 'Sehr geehrte/r Frau/Herr, Ihr entfernter Verwandte, der verstorbene nigerianische Prinz XY hat Sie zum Alleinerben auserkoren. Geben Sie hier Ihre Bankinformationen ein.',
    from: 'Ein anderer Absender <mail@example.org>',
    folder: folders[0],
  },
];

export interface State {
  phase: Phase;
  currentFolder: Folder;
  setCurrentFolder: (folder: Folder) => void;
  emails: Email[];
  currentEmail: Email | null;
  setCurrentEmail: (email: Email) => void;
  tempStart: () => void;
  shouldFinishAt?: Date;
}

export const useStore = create<State>((set) => ({
  phase: 'explanation',
  currentFolder: folders[0],
  setCurrentFolder(currentFolder) {
    set((state) => {
      if (state.currentEmail?.folder !== currentFolder) {
        return {currentFolder, currentEmail: null};
      } else {
        return {currentFolder};
      }
    });
  },
  currentEmail: explanationEmail,
  emails: [explanationEmail],
  setCurrentEmail(currentEmail) {
    set(
      produce((draft) => {
        const old = draft.currentEmail;
        if (old) {
          old.read = true;
        }

        draft.currentEmail = currentEmail;
      }),
    );
  },
  tempStart() {
    set({
      phase: 'run',
      emails,
      currentEmail: emails[0],
      shouldFinishAt: addMinutes(new Date(), 10),
    });
  },
}));
*/
