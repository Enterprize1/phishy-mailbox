import {describe, expect, it} from 'vitest';
import {randomUUID} from 'crypto';
import {getCaller, adminSession, createEmail, createStudyWithFolders} from '../../../../test/integration/helpers';
import {prismaTest} from '../../../../test/integration/setup';

const emailInput = () => ({
  senderMail: 'phisher@example.com',
  senderName: 'Phisher',
  subject: 'You won!',
  headers: 'X-Header: test',
  body: '<p>Click here</p>',
  allowExternalImages: false,
  backofficeIdentifier: `bo-${randomUUID()}`,
});

describe('email router', () => {
  it('blocks unauthenticated access', async () => {
    await expect(getCaller().email.getAll()).rejects.toMatchObject({code: 'UNAUTHORIZED'});
  });

  it('adds, reads, lists and updates an email', async () => {
    const caller = getCaller(adminSession());

    const created = await caller.email.add({email: emailInput()});
    expect(created.subject).toBe('You won!');

    const loaded = await caller.email.get(created.id);
    expect(loaded?.senderMail).toBe('phisher@example.com');

    const all = await caller.email.getAll();
    expect(all.some((e) => e.id === created.id)).toBe(true);

    const updated = await caller.email.update({
      id: created.id,
      email: {...emailInput(), subject: 'Edited subject'},
    });
    expect(updated.subject).toBe('Edited subject');
  });

  it('deletes an email that is not referenced by any study', async () => {
    const caller = getCaller(adminSession());
    const created = await caller.email.add({email: emailInput()});

    await caller.email.delete(created.id);

    expect(await caller.email.get(created.id)).toBeNull();
  });

  it('refuses to delete an email that is still used by a study', async () => {
    const caller = getCaller(adminSession());
    const email = await createEmail();
    await createStudyWithFolders({emails: [{emailId: email.id}]});

    await expect(caller.email.delete(email.id)).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: 'Email is in use',
    });

    // The email must still exist after the rejected delete.
    expect(await prismaTest.email.findUnique({where: {id: email.id}})).not.toBeNull();
  });

  it('parses an uploaded .eml file into email fields', async () => {
    const eml = [
      'From: "Bank Support" <support@bank.example>',
      'Subject: Verify your account',
      'Content-Type: text/html; charset=utf-8',
      '',
      '<p>Please verify your account.</p>',
    ].join('\r\n');
    const dataUrl = `data:message/rfc822;base64,${Buffer.from(eml).toString('base64')}`;

    const parsed = await getCaller(adminSession()).email.parseFile({file: dataUrl});

    expect(parsed.senderMail).toBe('support@bank.example');
    expect(parsed.senderName).toBe('Bank Support');
    expect(parsed.subject).toBe('Verify your account');
    expect(parsed.body).toContain('verify your account');
    expect(parsed.allowExternalImages).toBe(false);
    expect(parsed.backofficeIdentifier).toBe('Verify your account / Bank Support');
    expect(parsed.headers).toContain('Subject: Verify your account');
  });
});
