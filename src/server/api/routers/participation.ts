import {createTRPCRouter, protectedProcedure, publicProcedure} from '~/server/api/trpc';
import {z} from 'zod';
import {addMinutes} from 'date-fns';
import {EMailMovedEvent} from '~/server/api/routers/participationEvents';

export const participationRouter = createTRPCRouter({
  create: publicProcedure.input(z.string()).mutation(async ({ctx, input}) => {
    const study = await ctx.prisma.study.findUnique({
      where: {
        code: input,
      },
      include: {
        email: {
          include: {
            email: true,
          },
        },
      },
    });

    if (!study) {
      throw new Error('Study not found');
    }

    return ctx.prisma.participation.create({
      data: {
        studyId: study.id,
        createdAt: new Date(),
        emails: {
          createMany: {
            data: study.email.map((email) => ({
              emailId: email.email.id,
            })),
          },
        },
      },
    });
  }),
  get: publicProcedure.input(z.string().uuid()).query(async ({ctx, input}) => {
    return ctx.prisma.participation.findUnique({
      where: {
        id: input,
      },
      include: {
        study: {
          include: {
            folder: true,
          },
        },
        emails: {
          include: {
            email: true,
          },
        },
      },
    });
  }),
  start: publicProcedure.input(z.string().uuid()).mutation(async ({ctx, input}) => {
    const participation = await ctx.prisma.participation.findUnique({
      where: {
        id: input,
      },
    });

    if (!participation || participation.startedAt) {
      throw new Error('Participation not found');
    }

    return ctx.prisma.participation.update({
      where: {
        id: input,
      },
      data: {
        startedAt: new Date(),
      },
    });
  }),
  finish: publicProcedure.input(z.string().uuid()).mutation(async ({ctx, input}) => {
    const participation = await ctx.prisma.participation.findUnique({
      where: {
        id: input,
      },
      include: {
        emails: true,
        study: true,
      },
    });

    if (!participation || !participation.startedAt) {
      throw new Error('Participation not found');
    }

    const automatedFinishAt = addMinutes(participation.startedAt, participation.study.durationInMinutes);

    if (participation.emails.some((email) => !email.folderId) && new Date() < automatedFinishAt) {
      throw new Error('Not all emails have been sorted and the participation has not yet finished');
    }

    return ctx.prisma.participation.update({
      where: {
        id: input,
      },
      data: {
        finishedAt: new Date(),
      },
    });
  }),
  moveEmail: publicProcedure
    .input(z.object({participationId: z.string().uuid(), emailId: z.string().uuid(), folderId: z.string().uuid()}))
    .mutation(async ({ctx, input}) => {
      const participation = await ctx.prisma.participation.findUnique({
        where: {
          id: input.participationId,
        },
        include: {
          emails: {
            where: {
              emailId: input.emailId,
            },
          },
        },
      });

      if (!participation || !participation.startedAt || participation.finishedAt || !participation.emails[0]) {
        throw new Error('Participation not found');
      }

      const updateResult = ctx.prisma.participationEmail.update({
        where: {
          id: input.emailId,
        },
        data: {
          folderId: input.folderId,
        },
      });

      if (participation.emails[0].folderId !== input.folderId) {
        ctx.prisma.participationEmailEvent.create({
          data: {
            participationEmailId: input.emailId,
            createdAt: new Date(),
            data: {
              type: 'email-moved',
              fromFolderId: participation.emails[0].folderId,
              toFolderId: input.folderId,
            } as EMailMovedEvent,
          },
        });
      }

      return updateResult;
    }),
  getAllInStudy: protectedProcedure.input(z.string().uuid()).query(async ({ctx, input}) => {
    return ctx.prisma.participation.findMany({
      where: {
        studyId: input,
      },
    });
  }),
});
