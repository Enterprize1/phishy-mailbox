import {describe, expect, it} from 'vitest';
import {getCaller, adminSession, createEmail} from '../../../../test/integration/helpers';

describe('study router', () => {
  it('blocks unauthenticated access to getAll', async () => {
    await expect(getCaller().study.getAll()).rejects.toMatchObject({code: 'UNAUTHORIZED'});
  });

  it('adds a study with folders and emails, then reads it back', async () => {
    const caller = getCaller(adminSession());
    const email = await createEmail();

    const created = await caller.study.add({
      study: {
        name: 'My Study',
        openParticipation: false,
        consentRequired: false,
        consentText: '',
        timerMode: 'VISIBLE',
        externalImageMode: 'HIDE',
        durationInMinutes: 15,
        startText: 'Welcome',
        startLinkTemplate: 'https://example.com/start/{code}',
        endText: 'Goodbye',
        endLinkTemplate: 'https://example.com/end/{code}',
        folder: [{name: 'Inbox'}, {name: 'Junk'}],
        email: [{emailId: email.id, scheduledTime: 0}],
      },
    });

    const loaded = await caller.study.get(created.id);
    expect(loaded?.name).toBe('My Study');
    expect(loaded?.folder).toHaveLength(2);
    expect(loaded?.email).toHaveLength(1);
    expect(loaded?.email[0]?.emailId).toBe(email.id);
  });

  it('updates a study (renames a folder) within a transaction', async () => {
    const caller = getCaller(adminSession());
    const created = await caller.study.add({
      study: {
        name: 'Editable',
        openParticipation: false,
        consentRequired: false,
        consentText: '',
        timerMode: 'VISIBLE',
        externalImageMode: 'HIDE',
        durationInMinutes: 10,
        startText: '',
        startLinkTemplate: '',
        endText: '',
        endLinkTemplate: '',
        folder: [{name: 'Original'}],
        email: [],
      },
    });
    const loaded = await caller.study.get(created.id);

    await caller.study.update({
      id: created.id,
      study: {
        name: 'Editable',
        openParticipation: false,
        consentRequired: false,
        consentText: '',
        timerMode: 'VISIBLE',
        externalImageMode: 'HIDE',
        durationInMinutes: 10,
        startText: '',
        startLinkTemplate: '',
        endText: '',
        endLinkTemplate: '',
        folder: [{id: loaded!.folder[0]!.id, name: 'Renamed', order: 0}],
        email: [],
      },
    });

    const after = await caller.study.get(created.id);
    expect(after?.folder[0]?.name).toBe('Renamed');
  });

  it('deletes a study', async () => {
    const caller = getCaller(adminSession());
    const created = await caller.study.add({
      study: {
        name: 'Throwaway',
        openParticipation: false,
        consentRequired: false,
        consentText: '',
        timerMode: 'VISIBLE',
        externalImageMode: 'HIDE',
        durationInMinutes: 10,
        startText: '',
        startLinkTemplate: '',
        endText: '',
        endLinkTemplate: '',
        folder: [],
        email: [],
      },
    });

    await caller.study.delete(created.id);

    expect(await caller.study.get(created.id)).toBeNull();
  });
});
