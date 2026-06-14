import {describe, expect, it} from 'vitest';
import {randomUUID} from 'crypto';
import {
  getCaller,
  createEmail,
  createStudyWithFolders,
  createParticipation,
} from '../../../../test/integration/helpers';
import {prismaTest} from '../../../../test/integration/setup';

describe('participationEvent router', () => {
  // Materialise a participation with one (sortable) email and return its
  // participation id and the participation-email id needed by `track`.
  const seed = async () => {
    const email = await createEmail();
    const study = await createStudyWithFolders({emails: [{emailId: email.id}], timerMode: 'DISABLED'});
    const participation = await createParticipation(study.id);
    const loaded = await getCaller().participation.get(participation.code);
    return {participationId: participation.id, participationEmailId: loaded!.emails[0]!.id};
  };

  it('records a simple email-view event', async () => {
    const {participationId, participationEmailId} = await seed();

    const event = await getCaller().participationEvent.track({
      participationId,
      participationEmailId,
      event: {type: 'email-view'},
    });

    expect(event.participationEmailId).toBe(participationEmailId);
    const stored = await prismaTest.participationEmailEvent.findUnique({where: {id: event.id}});
    expect((stored?.data as {type: string}).type).toBe('email-view');
  });

  it('records a link-click event with its url and text', async () => {
    const {participationId, participationEmailId} = await seed();

    const event = await getCaller().participationEvent.track({
      participationId,
      participationEmailId,
      event: {type: 'email-link-click', url: 'https://example.com/phish', linkText: 'Click me'},
    });

    const stored = await prismaTest.participationEmailEvent.findUnique({where: {id: event.id}});
    expect(stored?.data).toMatchObject({
      type: 'email-link-click',
      url: 'https://example.com/phish',
      linkText: 'Click me',
    });
  });

  it('rejects an event for an unknown participation', async () => {
    const {participationEmailId} = await seed();

    await expect(
      getCaller().participationEvent.track({
        participationId: randomUUID(),
        participationEmailId,
        event: {type: 'email-view'},
      }),
    ).rejects.toThrow('Participation E-Mail not found');
  });

  it('rejects an event whose email does not belong to the participation', async () => {
    const {participationId} = await seed();

    await expect(
      getCaller().participationEvent.track({
        participationId,
        participationEmailId: randomUUID(),
        event: {type: 'email-view'},
      }),
    ).rejects.toThrow('Participation E-Mail not found');
  });

  it('rejects a malformed link-click event (invalid url)', async () => {
    const {participationId, participationEmailId} = await seed();

    await expect(
      getCaller().participationEvent.track({
        participationId,
        participationEmailId,
        event: {type: 'email-link-click', url: 'not-a-url', linkText: 'x'},
      }),
    ).rejects.toBeDefined();
  });
});
