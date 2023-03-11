import {createTRPCRouter, protectedProcedure, publicProcedure} from '~/server/api/trpc';
import {z} from 'zod';

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
    const participation = await ctx.prisma.participation.findUnique({
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

    return participation;
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

      if (!participation || !participation.startedAt) {
        throw new Error('Participation not found');
      }

      // TODO: Check that email belongs to participation

      return ctx.prisma.participationEmail.update({
        where: {
          id: input.emailId,
        },
        data: {
          folderId: input.folderId,
        },
      });
    }),
  getAllInStudy: protectedProcedure.input(z.string().uuid()).query(async ({ctx, input}) => {
    return ctx.prisma.participation.findMany({
      where: {
        studyId: input,
      },
    });
  }),
});
