import {createTRPCRouter, protectedProcedure, publicProcedure} from '~/server/api/trpc';
import {z} from 'zod';
import {addMinutes} from 'date-fns';
import {EMailMovedEvent} from '~/server/api/routers/participationEvents';
import {TRPCError} from '@trpc/server';

export const participationRouter = createTRPCRouter({
  createMultiple: protectedProcedure
    .input(
      z.object({
        studyId: z.string().uuid(),
        count: z.number().min(1).max(100),
      }),
    )
    .mutation(async ({ctx, input}) => {
      const study = await ctx.prisma.study.findUnique({
        where: {
          id: input.studyId,
        },
      });

      if (!study) {
        throw new Error('Study not found');
      }

      for (let i = 0; i < input.count; i++) {
        const totalCount = await ctx.prisma.participation.count({where: {studyId: study.id}});
        const codeLength = Math.max(2, Math.ceil(Math.log10((totalCount + 1) * 2)));

        const getNewRandomCode = async (): Promise<string> => {
          const code = Math.floor(Math.random() * 10 ** codeLength)
            .toString()
            .padStart(codeLength, '0');

          if (
            await ctx.prisma.participation.findUnique({
              where: {
                code,
              },
            })
          ) {
            return getNewRandomCode();
          }

          return code;
        };

        const code = await getNewRandomCode();

        await ctx.prisma.participation.create({
          data: {
            code,
            studyId: study.id,
            createdAt: new Date(),
          },
        });
      }
    }),
  delete: protectedProcedure.input(z.string().uuid()).mutation(async ({ctx, input}) => {
    const participation = await ctx.prisma.participation.findUnique({
      where: {
        id: input,
      },
    });

    if (!participation) {
      throw new Error('Participation not found');
    }

    return ctx.prisma.participation.delete({
      where: {
        id: input,
      },
    });
  }),
  get: publicProcedure.input(z.string()).query(async ({ctx, input}) => {
    const participation = await ctx.prisma.participation.findUnique({
      where: {
        code: input,
      },
      include: {
        study: {
          include: {
            email: {
              include: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!participation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Participation not found',
      });
    }

    if (participation && !participation.codeUsedAt) {
      await ctx.prisma.participation.update({
        where: {
          id: participation.id,
        },
        data: {
          codeUsedAt: new Date(),
          emails: {
            createMany: {
              data: participation.study.email.map((email) => ({
                emailId: email.email.id,
              })),
            },
          },
        },
      });
    }

    return ctx.prisma.participation.findUnique({
      where: {
        code: input,
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
  clickStartLink: publicProcedure.input(z.string().uuid()).mutation(async ({ctx, input}) => {
    const participation = await ctx.prisma.participation.findUnique({
      where: {
        id: input,
      },
    });

    if (!participation?.startLinkClickedAt) {
      await ctx.prisma.participation.update({
        where: {
          id: input,
        },
        data: {
          startLinkClickedAt: new Date(),
        },
      });
    }
  }),
  clickEndLink: publicProcedure.input(z.string().uuid()).mutation(async ({ctx, input}) => {
    const participation = await ctx.prisma.participation.findUnique({
      where: {
        id: input,
      },
    });

    if (!participation?.endLinkClickedAt) {
      await ctx.prisma.participation.update({
        where: {
          id: input,
        },
        data: {
          endLinkClickedAt: new Date(),
        },
      });
    }
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
              id: input.emailId,
            },
          },
        },
      });

      if (!participation || !participation.startedAt || participation.finishedAt || !participation.emails[0]) {
        throw new Error('Participation not found');
      }

      const updateResult = await ctx.prisma.participationEmail.update({
        where: {
          id: input.emailId,
        },
        data: {
          folderId: input.folderId,
        },
      });

      if (participation.emails[0].folderId !== input.folderId) {
        await ctx.prisma.participationEmailEvent.create({
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
