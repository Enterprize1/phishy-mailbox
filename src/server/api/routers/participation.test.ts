import {describe, expect, it} from 'vitest';
import {randomUUID} from 'crypto';
import {subMinutes} from 'date-fns';
import {TRPCError} from '@trpc/server';
import {getCaller, adminSession, createEmail, createStudyWithFolders, createParticipation} from '../../../../test/integration/helpers';
import {prismaTest} from '../../../../test/integration/setup';

describe('participation router', () => {
  const seedStudy = async (opts?: {scheduledTime?: number; timerMode?: 'DISABLED' | 'HIDDEN' | 'VISIBLE'}) => {
    const email = await createEmail();
    const study = await createStudyWithFolders({
      emails: [{emailId: email.id, scheduledTime: opts?.scheduledTime}],
      timerMode: opts?.timerMode,
    });
    const participation = await createParticipation(study.id, 'abc123');
    return {study, participation, email};
  };

  describe('get', () => {
    it('materialises the participation emails and stamps codeUsedAt on first use', async () => {
      const {participation, email} = await seedStudy();

      const result = await getCaller().participation.get(participation.code);

      expect(result?.codeUsedAt).toBeTruthy();
      expect(result?.emails).toHaveLength(1);
      expect(result?.emails[0]?.email.id).toBe(email.id);
    });

    it('does not duplicate emails when the code is used again', async () => {
      const {participation} = await seedStudy();

      await getCaller().participation.get(participation.code);
      const second = await getCaller().participation.get(participation.code);

      expect(second?.emails).toHaveLength(1);
    });

    it('throws NOT_FOUND for an unknown code', async () => {
      await expect(getCaller().participation.get('does-not-exist')).rejects.toMatchObject({code: 'NOT_FOUND'});
    });
  });

  describe('start / finish', () => {
    it('start stamps startedAt and refuses a second start', async () => {
      const {participation} = await seedStudy();

      const started = await getCaller().participation.start(participation.id);
      expect(started.startedAt).toBeTruthy();

      await expect(getCaller().participation.start(participation.id)).rejects.toThrow();
    });

    it('finish refuses unsorted emails while the timer is still running', async () => {
      const {participation} = await seedStudy({timerMode: 'VISIBLE'});
      await getCaller().participation.get(participation.code); // create emails (unsorted)
      await getCaller().participation.start(participation.id);

      await expect(getCaller().participation.finish(participation.id)).rejects.toThrow();
    });

    it('finish succeeds with unsorted emails when the timer is disabled', async () => {
      const {participation} = await seedStudy({timerMode: 'DISABLED'});
      await getCaller().participation.get(participation.code);
      await getCaller().participation.start(participation.id);

      const finished = await getCaller().participation.finish(participation.id);
      expect(finished.finishedAt).toBeTruthy();
    });
  });

  describe('finish (timer elapsed)', () => {
    it('allows finishing with unsorted emails once the timer has elapsed', async () => {
      const {participation} = await seedStudy({timerMode: 'VISIBLE'});
      await getCaller().participation.get(participation.code); // materialise emails (unsorted)
      await getCaller().participation.start(participation.id);

      // Backdate the start so the automated finish time lies in the past.
      await prismaTest.participation.update({
        where: {id: participation.id},
        data: {startedAt: subMinutes(new Date(), 60)},
      });

      const finished = await getCaller().participation.finish(participation.id);
      expect(finished.finishedAt).toBeTruthy();
    });

    it('refuses to finish a participation that has not been started', async () => {
      const {participation} = await seedStudy();
      await expect(getCaller().participation.finish(participation.id)).rejects.toThrow();
    });
  });

  describe('giveConsent', () => {
    it('stamps consentGivenAt', async () => {
      const {participation} = await seedStudy();
      const result = await getCaller().participation.giveConsent(participation.id);
      expect(result.consentGivenAt).toBeTruthy();
    });
  });

  describe('clickStartLink / clickEndLink', () => {
    it('records the first start-link click and is idempotent afterwards', async () => {
      const {participation} = await seedStudy();

      await getCaller().participation.clickStartLink(participation.id);
      const first = await prismaTest.participation.findUnique({where: {id: participation.id}});
      expect(first?.startLinkClickedAt).toBeTruthy();

      await getCaller().participation.clickStartLink(participation.id);
      const second = await prismaTest.participation.findUnique({where: {id: participation.id}});
      // A second click must not overwrite the original timestamp.
      expect(second?.startLinkClickedAt?.getTime()).toBe(first?.startLinkClickedAt?.getTime());
    });

    it('records the first end-link click and is idempotent afterwards', async () => {
      const {participation} = await seedStudy();

      await getCaller().participation.clickEndLink(participation.id);
      const first = await prismaTest.participation.findUnique({where: {id: participation.id}});
      expect(first?.endLinkClickedAt).toBeTruthy();

      await getCaller().participation.clickEndLink(participation.id);
      const second = await prismaTest.participation.findUnique({where: {id: participation.id}});
      expect(second?.endLinkClickedAt?.getTime()).toBe(first?.endLinkClickedAt?.getTime());
    });
  });

  describe('delete', () => {
    it('deletes an existing participation', async () => {
      const {participation} = await seedStudy();
      await getCaller(adminSession()).participation.delete(participation.id);
      expect(await prismaTest.participation.findUnique({where: {id: participation.id}})).toBeNull();
    });

    it('throws when the participation does not exist', async () => {
      await expect(getCaller(adminSession()).participation.delete(randomUUID())).rejects.toThrow(
        'Participation not found',
      );
    });

    it('requires authentication', async () => {
      const {participation} = await seedStudy();
      await expect(getCaller().participation.delete(participation.id)).rejects.toBeInstanceOf(TRPCError);
    });
  });

  describe('moveEmail', () => {
    it('moves an email into a folder and records a move event', async () => {
      const {study, participation} = await seedStudy();
      const loaded = await getCaller().participation.get(participation.code);
      await getCaller().participation.start(participation.id);

      const participationEmailId = loaded!.emails[0]!.id;
      const targetFolderId = study.folder[2]!.id; // "Junk"

      const moved = await getCaller().participation.moveEmail({
        participationId: participation.id,
        emailId: participationEmailId,
        folderId: targetFolderId,
      });

      expect(moved.folderId).toBe(targetFolderId);

      const stored = await getCaller().participation.get(participation.code);
      expect(stored?.emails[0]?.folderId).toBe(targetFolderId);
    });

    it('does not record a second move event when the email stays in the same folder', async () => {
      const {study, participation} = await seedStudy();
      const loaded = await getCaller().participation.get(participation.code);
      await getCaller().participation.start(participation.id);
      const participationEmailId = loaded!.emails[0]!.id;
      const folderId = study.folder[0]!.id;

      await getCaller().participation.moveEmail({participationId: participation.id, emailId: participationEmailId, folderId});
      await getCaller().participation.moveEmail({participationId: participation.id, emailId: participationEmailId, folderId});

      const events = await prismaTest.participationEmailEvent.findMany({where: {participationEmailId}});
      const moves = events.filter((e) => (e.data as {type: string}).type === 'email-moved');
      expect(moves).toHaveLength(1);
    });

    it('refuses to move an email before the participation has started', async () => {
      const {study, participation} = await seedStudy();
      const loaded = await getCaller().participation.get(participation.code);

      await expect(
        getCaller().participation.moveEmail({
          participationId: participation.id,
          emailId: loaded!.emails[0]!.id,
          folderId: study.folder[0]!.id,
        }),
      ).rejects.toThrow('Participation not found');
    });

    it('refuses to move an email after the participation has finished', async () => {
      const {study, participation} = await seedStudy({timerMode: 'DISABLED'});
      const loaded = await getCaller().participation.get(participation.code);
      await getCaller().participation.start(participation.id);
      await getCaller().participation.finish(participation.id);

      await expect(
        getCaller().participation.moveEmail({
          participationId: participation.id,
          emailId: loaded!.emails[0]!.id,
          folderId: study.folder[0]!.id,
        }),
      ).rejects.toThrow('Participation not found');
    });
  });

  describe('createMultiple', () => {
    it('requires authentication', async () => {
      const {study} = await seedStudy();
      await expect(
        getCaller().participation.createMultiple({studyId: study.id, count: 1}),
      ).rejects.toBeInstanceOf(TRPCError);
    });

    it('creates the requested number of participations for an admin', async () => {
      const {study} = await seedStudy();

      await getCaller(adminSession()).participation.createMultiple({studyId: study.id, count: 3});

      const all = await getCaller(adminSession()).participation.getAllInStudy(study.id);
      // 1 from the factory + 3 created here
      expect(all).toHaveLength(4);
    });

    it('throws when the target study does not exist', async () => {
      await expect(
        getCaller(adminSession()).participation.createMultiple({studyId: randomUUID(), count: 1}),
      ).rejects.toThrow('Study not found');
    });

    it('generates unique codes when creating many participations', async () => {
      const {study} = await seedStudy();

      await getCaller(adminSession()).participation.createMultiple({studyId: study.id, count: 10});

      const all = await getCaller(adminSession()).participation.getAllInStudy(study.id);
      const codes = all.map((p) => p.code);
      expect(new Set(codes).size).toBe(codes.length);
    });
  });
});
