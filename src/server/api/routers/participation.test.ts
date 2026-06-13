import {describe, expect, it} from 'vitest';
import {TRPCError} from '@trpc/server';
import {getCaller, adminSession, createEmail, createStudyWithFolders, createParticipation} from '../../../../test/integration/helpers';

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
  });
});
