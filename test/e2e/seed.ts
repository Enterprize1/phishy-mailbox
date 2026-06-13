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

/** Create a single standalone email. Returns the created row. */
export const seedEmail = (
  prisma: PrismaClient,
  overrides: Partial<Parameters<PrismaClient['email']['create']>[0]['data']> = {},
) =>
  prisma.email.create({
    data: {
      senderMail: 'sender@example.com',
      senderName: 'Sender',
      subject: 'Subject',
      headers: 'X-Header: Test',
      body: '<p>Body</p>',
      allowExternalImages: false,
      backofficeIdentifier: 'Test-Email',
      ...overrides,
    },
  });

/** Create an admin user with a known password. Returns the created row. */
export const seedUser = async (
  prisma: PrismaClient,
  {email, password = 'pw-123456', canManageUsers = false}: {email: string; password?: string; canManageUsers?: boolean},
) =>
  prisma.user.create({
    data: {
      email,
      password: await bcrypt.hash(password, 10),
      canManageUsers,
    },
  });

/**
 * Seed a study tailored for interaction tracking: a single email that has an
 * external image prompt (ASK), inspectable headers, a clickable link and enough
 * body height to scroll. Returns everything a test needs to drive the flow.
 */
export const seedTrackingStudy = async (prisma: PrismaClient) => {
  const filler = Array.from({length: 60}, (_, i) => `<p>Filler line ${i}</p>`).join('');
  const email = await prisma.email.create({
    data: {
      senderMail: 'tracker@example.com',
      senderName: 'Tracker',
      subject: 'Tracked Subject',
      headers: 'X-Tracking: enabled',
      body: `<a href="https://example.com/target">Visit</a>${filler}`,
      allowExternalImages: true,
      backofficeIdentifier: 'Tracking-Email',
    },
  });

  const code = 'c' + Math.random().toString(36).slice(2, 8);
  const folderName = 'Sortierordner';

  const study = await prisma.study.create({
    data: {
      name: 'E2E Tracking',
      startText: 'Bitte starten',
      endText: 'Ende',
      durationInMinutes: 10,
      timerMode: 'VISIBLE',
      externalImageMode: 'ASK',
      consentRequired: false,
      folder: {createMany: {data: [{name: folderName, order: 0}]}},
      email: {createMany: {data: [{emailId: email.id, order: 0}]}},
      participation: {createMany: {data: [{code, createdAt: new Date()}]}},
    },
  });

  return {code, studyId: study.id, emailId: email.id, folderName};
};

/** Seed a study that requires consent before the participant can begin. */
export const seedConsentStudy = async (prisma: PrismaClient) => {
  const email = await seedEmail(prisma, {backofficeIdentifier: 'Consent-Email'});
  const code = 'c' + Math.random().toString(36).slice(2, 8);

  const study = await prisma.study.create({
    data: {
      name: 'E2E Consent',
      startText: 'Bitte starten',
      endText: 'Ende',
      durationInMinutes: 10,
      timerMode: 'DISABLED',
      externalImageMode: 'HIDE',
      consentRequired: true,
      consentText: '<p>Bitte stimmen Sie der Teilnahme zu.</p>',
      folder: {createMany: {data: [{name: 'Ordner', order: 0}]}},
      email: {createMany: {data: [{emailId: email.id, order: 0}]}},
      participation: {createMany: {data: [{code, createdAt: new Date()}]}},
    },
  });

  return {code, studyId: study.id};
};

/**
 * Seed a study with two inbox emails where the second one only becomes visible
 * `delaySeconds` after the participant starts. Used to exercise the scheduled-
 * email visibility logic on the participant interface.
 */
export const seedScheduledStudy = async (prisma: PrismaClient, delaySeconds = 3) => {
  const immediate = await seedEmail(prisma, {
    subject: 'Immediate Subject',
    senderName: 'Immediate',
    backofficeIdentifier: 'Immediate-Email',
  });
  const delayed = await seedEmail(prisma, {
    subject: 'Delayed Subject',
    senderName: 'Delayed',
    backofficeIdentifier: 'Delayed-Email',
  });

  const code = 'c' + Math.random().toString(36).slice(2, 8);

  const study = await prisma.study.create({
    data: {
      name: 'E2E Scheduled',
      startText: 'Bitte starten',
      endText: 'Ende',
      durationInMinutes: 10,
      timerMode: 'DISABLED',
      externalImageMode: 'HIDE',
      consentRequired: false,
      folder: {createMany: {data: [{name: 'Sortierordner', order: 0}]}},
      email: {
        createMany: {
          data: [
            {emailId: immediate.id, order: 0, scheduledTime: 0},
            {emailId: delayed.id, order: 1, scheduledTime: delaySeconds},
          ],
        },
      },
      participation: {createMany: {data: [{code, createdAt: new Date()}]}},
    },
  });

  return {code, studyId: study.id, delaySeconds};
};

/** Seed a study that hands out a fresh code per visitor via /new/{studyId}. */
export const seedOpenStudy = async (prisma: PrismaClient, openParticipation = true) => {
  const email = await seedEmail(prisma, {backofficeIdentifier: 'Open-Email'});

  const study = await prisma.study.create({
    data: {
      name: 'E2E Open',
      startText: 'Bitte starten',
      endText: 'Ende',
      durationInMinutes: 10,
      timerMode: 'DISABLED',
      externalImageMode: 'HIDE',
      consentRequired: false,
      openParticipation,
      folder: {createMany: {data: [{name: 'Ordner', order: 0}]}},
      email: {createMany: {data: [{emailId: email.id, order: 0}]}},
    },
  });

  return {studyId: study.id};
};

/**
 * Seed a single-email study with a configurable timer mode and an external-image
 * setting, plus a participation code. Used for timer-mode and external-image tests.
 */
export const seedSingleEmailStudy = async (
  prisma: PrismaClient,
  {
    timerMode = 'VISIBLE',
    externalImageMode = 'HIDE',
    allowExternalImages = false,
    body = '<p>Body</p>',
  }: {
    timerMode?: 'DISABLED' | 'HIDDEN' | 'VISIBLE';
    externalImageMode?: 'ASK' | 'HIDE' | 'SHOW';
    allowExternalImages?: boolean;
    body?: string;
  } = {},
) => {
  const email = await seedEmail(prisma, {
    subject: 'Single Subject',
    senderName: 'Single',
    backofficeIdentifier: 'Single-Email',
    allowExternalImages,
    body,
  });

  const code = 'c' + Math.random().toString(36).slice(2, 8);

  const study = await prisma.study.create({
    data: {
      name: 'E2E Single',
      startText: 'Bitte starten',
      endText: 'Ende',
      durationInMinutes: 10,
      timerMode,
      externalImageMode,
      consentRequired: false,
      folder: {createMany: {data: [{name: 'Sortierordner', order: 0}]}},
      email: {createMany: {data: [{emailId: email.id, order: 0}]}},
      participation: {createMany: {data: [{code, createdAt: new Date()}]}},
    },
  });

  return {code, studyId: study.id, emailId: email.id};
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
