import {describe, expect, it} from 'vitest';
import {randomUUID} from 'crypto';
import {
  getCaller,
  adminSession,
  createEmail,
  createStudyWithFolders,
  createParticipation,
} from '../../../../test/integration/helpers';

const importableEmail = (order: number) => ({
  id: randomUUID(),
  senderMail: 'sender@example.com',
  senderName: 'Sender',
  subject: `Imported ${order}`,
  headers: 'X-Header: test',
  body: '<p>Body</p>',
  allowExternalImages: false,
  backofficeIdentifier: `bo-${randomUUID()}`,
  order,
});

const importableStudy = (overrides: Record<string, unknown> = {}) => ({
  id: randomUUID(),
  name: 'Imported Study',
  openParticipation: false,
  consentRequired: false,
  consentText: '',
  timerMode: 'VISIBLE' as const,
  externalImageMode: 'HIDE' as const,
  durationInMinutes: 20,
  startText: 'Start',
  startLinkTemplate: 'https://example.com/start/{code}',
  endText: 'End',
  endLinkTemplate: 'https://example.com/end/{code}',
  folder: [{id: randomUUID(), name: 'Inbox', order: 0}],
  email: [importableEmail(0)],
  ...overrides,
});

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

  it('updates a study by deleting, adding and reordering folders and removing an email', async () => {
    const caller = getCaller(adminSession());
    const email = await createEmail();
    const created = await caller.study.add({
      study: {
        name: 'Reshaped',
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
        folder: [{name: 'First'}, {name: 'Second'}],
        email: [{emailId: email.id, scheduledTime: 0}],
      },
    });
    const loaded = await caller.study.get(created.id);
    const second = loaded!.folder.find((f) => f.name === 'Second')!;

    await caller.study.update({
      id: created.id,
      study: {
        name: 'Reshaped',
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
        // Drop "First", keep "Second" (now at the front) and append a new folder.
        folder: [
          {id: second.id, name: 'Second', order: 0},
          {name: 'Third', order: 1},
        ],
        // Remove the only email.
        email: [],
      },
    });

    const after = await caller.study.get(created.id);
    expect(after!.folder.map((f) => f.name)).toEqual(['Second', 'Third']);
    expect(after!.email).toHaveLength(0);
  });

  it('updates a study by editing an existing email and adding a new one', async () => {
    const caller = getCaller(adminSession());
    const emailA = await createEmail();
    const emailB = await createEmail();
    const created = await caller.study.add({
      study: {
        name: 'With Emails',
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
        email: [{emailId: emailA.id, scheduledTime: 0}],
      },
    });
    const loaded = await caller.study.get(created.id);

    await caller.study.update({
      id: created.id,
      study: {
        name: 'With Emails',
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
        email: [
          // Edit the existing study-email (reschedule it) ...
          {id: loaded!.email[0]!.id, emailId: emailA.id, order: 0, scheduledTime: 30},
          // ... and append a brand-new one.
          {emailId: emailB.id, order: 1, scheduledTime: 0},
        ],
      },
    });

    const after = await caller.study.get(created.id);
    expect(after!.email).toHaveLength(2);
    expect(after!.email.find((e) => e.emailId === emailA.id)?.scheduledTime).toBe(30);
    expect(after!.email.some((e) => e.emailId === emailB.id)).toBe(true);
  });

  it('exports a participation with its full lifecycle of events', async () => {
    const anon = getCaller();
    const email = await createEmail();
    const study = await createStudyWithFolders({
      emails: [{emailId: email.id}],
      timerMode: 'DISABLED',
    });
    const participation = await createParticipation(study.id, 'lifecycle-code');

    // Drive a real participation: use the code (materialises emails), start it,
    // move the email into a folder (records a move event) and finish.
    const loaded = await anon.participation.get(participation.code);
    await anon.participation.start(participation.id);
    await anon.participation.moveEmail({
      participationId: participation.id,
      emailId: loaded!.emails[0]!.id,
      folderId: study.folder[0]!.id,
    });
    await anon.participation.finish(participation.id);

    const rows = await getCaller(adminSession()).study.export(study.id);
    const types = rows.map((r) => r.Type);

    expect(types).toEqual(expect.arrayContaining(['created', 'code-used', 'started', 'email-moved', 'finished']));
  });

  it('exports the full lifecycle including consent and link clicks', async () => {
    const anon = getCaller();
    const email = await createEmail();
    const study = await createStudyWithFolders({emails: [{emailId: email.id}], timerMode: 'DISABLED'});
    const participation = await createParticipation(study.id, 'full-lifecycle');

    await anon.participation.get(participation.code); // code-used
    await anon.participation.clickStartLink(participation.id); // start-link-clicked
    await anon.participation.giveConsent(participation.id); // consent-given
    await anon.participation.start(participation.id); // started
    await anon.participation.finish(participation.id); // finished
    await anon.participation.clickEndLink(participation.id); // end-link-clicked

    const rows = await getCaller(adminSession()).study.export(study.id);
    const types = rows.map((r) => r.Type);

    expect(types).toEqual(
      expect.arrayContaining([
        'created',
        'code-used',
        'consent-given',
        'start-link-clicked',
        'started',
        'finished',
        'end-link-clicked',
      ]),
    );
  });

  it('maps each tracked event type onto its own export columns', async () => {
    const anon = getCaller();
    const email = await createEmail();
    const study = await createStudyWithFolders({
      folderNames: ['Inbox', 'Junk'],
      emails: [{emailId: email.id}],
      timerMode: 'DISABLED',
    });
    const participation = await createParticipation(study.id, 'columns-code');
    const loaded = await anon.participation.get(participation.code);
    await anon.participation.start(participation.id);

    const participationEmailId = loaded!.emails[0]!.id;
    const inbox = study.folder[0]!;
    const junk = study.folder[1]!;
    const track = (event: Parameters<typeof anon.participationEvent.track>[0]['event']) =>
      anon.participationEvent.track({participationId: participation.id, participationEmailId, event});

    await track({type: 'email-moved', fromFolderId: inbox.id, toFolderId: junk.id});
    await track({type: 'email-scrolled', scrollPosition: 420});
    await track({type: 'email-link-click', url: 'https://example.com/phish', linkText: 'Reset password'});
    await track({type: 'email-link-hover', url: 'https://example.com/hover', linkText: 'Hover me'});

    const rows = await getCaller(adminSession()).study.export(study.id);
    const byType = (t: string) => rows.find((r) => r.Type === t)!;

    expect(byType('email-moved')).toMatchObject({'From Folder': 'Inbox', 'To Folder': 'Junk'});
    expect(byType('email-scrolled')).toMatchObject({'Scrolled To': 420});
    expect(byType('email-link-click')).toMatchObject({URL: 'https://example.com/phish', 'Link Text': 'Reset password'});
    expect(byType('email-link-hover')).toMatchObject({URL: 'https://example.com/hover', 'Link Text': 'Hover me'});

    // Columns that do not belong to a given event type must stay null.
    expect(byType('email-scrolled')['From Folder']).toBeNull();
    expect(byType('email-link-click')['Scrolled To']).toBeNull();
  });

  it('throws when exporting a study that does not exist', async () => {
    await expect(getCaller(adminSession()).study.export(randomUUID())).rejects.toThrow('Study not found');
  });

  describe('exportStudyStructure', () => {
    it('returns folders without their studyId and emails with their order', async () => {
      const email = await createEmail({subject: 'Structured'});
      const study = await createStudyWithFolders({folderNames: ['Inbox', 'Junk'], emails: [{emailId: email.id}]});

      const structure = await getCaller(adminSession()).study.exportStudyStructure(study.id);

      expect(structure.name).toBe(study.name);
      expect(structure.folder).toHaveLength(2);
      expect(structure.folder.every((f) => !('studyId' in f))).toBe(true);
      expect(structure.email).toHaveLength(1);
      expect(structure.email[0]).toMatchObject({id: email.id, subject: 'Structured', order: 0});
    });

    it('throws when the study does not exist', async () => {
      await expect(getCaller(adminSession()).study.exportStudyStructure(randomUUID())).rejects.toThrow('Study not found');
    });
  });

  describe('importStudy', () => {
    it('creates a new study with its folders and emails', async () => {
      const caller = getCaller(adminSession());
      const input = importableStudy();

      await caller.study.importStudy(input);

      const structure = await caller.study.exportStudyStructure(input.id);
      expect(structure.name).toBe('Imported Study');
      expect(structure.folder.map((f) => f.name)).toEqual(['Inbox']);
      expect(structure.email).toHaveLength(1);
      expect(structure.email[0]?.subject).toBe('Imported 0');
    });

    it('is idempotent and prunes folders/emails removed from the import payload', async () => {
      const caller = getCaller(adminSession());
      const id = randomUUID();
      const keptFolder = {id: randomUUID(), name: 'Kept', order: 0};
      const removedFolder = {id: randomUUID(), name: 'Removed', order: 1};
      const keptEmail = importableEmail(0);
      const removedEmail = importableEmail(1);

      await caller.study.importStudy(
        importableStudy({id, folder: [keptFolder, removedFolder], email: [keptEmail, removedEmail]}),
      );

      // Re-import the same study with one folder and one email dropped.
      await caller.study.importStudy(
        importableStudy({id, name: 'Renamed', folder: [keptFolder], email: [keptEmail]}),
      );

      const structure = await caller.study.exportStudyStructure(id);
      expect(structure.name).toBe('Renamed');
      expect(structure.folder.map((f) => f.name)).toEqual(['Kept']);
      expect(structure.email.map((e) => e.id)).toEqual([keptEmail.id]);
    });
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

  it('cascades through participations, emails and events when deleting a study', async () => {
    const anon = getCaller();
    const email = await createEmail();
    const study = await createStudyWithFolders({emails: [{emailId: email.id}], timerMode: 'DISABLED'});
    const participation = await createParticipation(study.id, 'cascade-code');

    // Produce a participation email and an event so the delete transaction has
    // rows to clean up in every cascade step.
    const loaded = await anon.participation.get(participation.code);
    await anon.participation.start(participation.id);
    await anon.participation.moveEmail({
      participationId: participation.id,
      emailId: loaded!.emails[0]!.id,
      folderId: study.folder[0]!.id,
    });

    await getCaller(adminSession()).study.delete(study.id);

    expect(await getCaller(adminSession()).study.get(study.id)).toBeNull();
    expect(await getCaller(adminSession()).participation.getAllInStudy(study.id)).toHaveLength(0);
  });

  it('throws when deleting a study that does not exist', async () => {
    await expect(getCaller(adminSession()).study.delete(randomUUID())).rejects.toThrow('Study not found');
  });
});
