import {PrismaClient} from '@prisma/client';
import * as bcrypt from 'bcrypt';

// All tables, child-first, so a plain TRUNCATE ... CASCADE gives a clean slate.
const TABLES = [
  'ParticipationEmailEvent',
  'ParticipationEmail',
  'Participation',
  'StudyEmail',
  'Folder',
  'Study',
  'Email',
  'User',
];

/** Wipe every table. Called before each e2e test against the worker's own DB. */
export const resetDb = async (prisma: PrismaClient) => {
  const list = TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
};

export const ADMIN_EMAIL = 'admin@example.com';
export const ADMIN_PASSWORD = '123456';

export const seedAdmin = async (prisma: PrismaClient) => {
  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      password: await bcrypt.hash(ADMIN_PASSWORD, 10),
      canManageUsers: true,
    },
  });
};

/**
 * Seed a complete, ready-to-run study with two emails and a participation code.
 * Mirrors the shape the participant interface expects (folders, start/end links).
 */
export const seedParticipantStudy = async (prisma: PrismaClient) => {
  const notPhishing = await prisma.email.create({
    data: {
      senderMail: 'human@example.com',
      senderName: 'Human',
      subject: 'Not-Phishing',
      headers: 'X-Header: Test',
      body: 'Dies ist keine Phishing-Mail',
      backofficeIdentifier: 'Not-Phishing',
    },
  });
  const phishing = await prisma.email.create({
    data: {
      senderMail: 'phish@example.com',
      senderName: 'Phish',
      subject: 'Phishing',
      headers: 'X-Header: Test',
      body: 'Dies ist eine Phishing-Mail <a href="https://example.com">Link</a>',
      backofficeIdentifier: 'Phishing',
    },
  });

  const code = 'c' + Math.random().toString(36).slice(2, 8);

  const study = await prisma.study.create({
    data: {
      name: 'E2E Teststudie',
      startText: 'Test-Beschreibung',
      endText: 'Test-Ende',
      durationInMinutes: 10,
      timerMode: 'VISIBLE',
      startLinkTemplate: 'https://example.com/start/{code}',
      endLinkTemplate: 'https://example.com/end/{code}',
      folder: {
        createMany: {
          data: [
            {name: 'Jetzt bearbeiten', order: 0},
            {name: 'Später bearbeiten', order: 1},
            {name: 'Junk', order: 2},
          ],
        },
      },
      email: {
        createMany: {
          data: [
            {emailId: notPhishing.id, order: 0},
            {emailId: phishing.id, order: 1},
          ],
        },
      },
      participation: {
        createMany: {
          data: [{code, createdAt: new Date()}],
        },
      },
    },
  });

  return {code, studyId: study.id};
};
