import {Session} from 'next-auth';
import {appRouter} from '~/server/api/root';
import {prismaTest} from './setup';

/**
 * Build a tRPC caller bound to the current test transaction. Pass a session to
 * exercise `protectedProcedure`s; omit it (or pass null) to act as an anonymous
 * participant.
 */
export const getCaller = (session: Session | null = null) =>
  appRouter.createCaller({prisma: prismaTest, session});

export const adminSession = (): Session => ({
  user: {
    id: 'admin-test-id',
    name: 'admin',
    email: 'admin@example.com',
    canManageUsers: true,
  },
  expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
});

// --- Factories (operate on the rolled-back test transaction) ----------------

let counter = 0;
const uniq = () => `${Date.now()}-${counter++}`;

export const createEmail = (overrides: Partial<Parameters<typeof prismaTest.email.create>[0]['data']> = {}) =>
  prismaTest.email.create({
    data: {
      senderMail: 'sender@example.com',
      senderName: 'Sender',
      subject: `Subject ${uniq()}`,
      headers: 'X-Header: Test',
      body: 'Body',
      backofficeIdentifier: `bo-${uniq()}`,
      ...overrides,
    },
  });

interface StudyOptions {
  name?: string;
  folderNames?: string[];
  /** emailId + optional scheduledTime per study email */
  emails?: {emailId: string; scheduledTime?: number}[];
  durationInMinutes?: number;
  timerMode?: 'DISABLED' | 'HIDDEN' | 'VISIBLE';
  startLinkTemplate?: string;
  endLinkTemplate?: string;
}

export const createStudyWithFolders = async (options: StudyOptions = {}) => {
  const {
    name = `Study ${uniq()}`,
    folderNames = ['Jetzt bearbeiten', 'Später bearbeiten', 'Junk'],
    emails = [],
    durationInMinutes = 10,
    timerMode = 'VISIBLE',
    startLinkTemplate = 'https://example.com/start/{code}',
    endLinkTemplate = 'https://example.com/end/{code}',
  } = options;

  return prismaTest.study.create({
    data: {
      name,
      startText: 'Start',
      endText: 'End',
      durationInMinutes,
      timerMode,
      startLinkTemplate,
      endLinkTemplate,
      folder: {
        createMany: {data: folderNames.map((n, order) => ({name: n, order}))},
      },
      email: {
        createMany: {
          data: emails.map((e, order) => ({emailId: e.emailId, order, scheduledTime: e.scheduledTime ?? 0})),
        },
      },
    },
    include: {folder: {orderBy: {order: 'asc'}}, email: {orderBy: {order: 'asc'}}},
  });
};

export const createParticipation = (studyId: string, code = `code-${uniq()}`) =>
  prismaTest.participation.create({
    data: {code, studyId, createdAt: new Date()},
  });
