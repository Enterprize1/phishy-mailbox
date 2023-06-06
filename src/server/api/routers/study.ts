import {createTRPCRouter, protectedProcedure} from '~/server/api/trpc';
import {z} from 'zod';
import {ParticipationEvents} from '~/server/api/routers/participationEvents';

export const studyRouter = createTRPCRouter({
  getAll: protectedProcedure.query(({ctx}) => {
    return ctx.prisma.study.findMany({
      orderBy: {name: 'asc'},
      include: {
        _count: {
          select: {
            participation: true,
          },
        },
      },
    });
  }),
  add: protectedProcedure
    .input(
      z.object({
        study: z.object({
          name: z.string(),
          introductionText: z.string(),
          durationInMinutes: z.number(),
        }),
      }),
    )
    .mutation(async ({ctx, input}) => {
      const totalCount = await ctx.prisma.study.count();
      const codeLength = Math.max(2, Math.ceil(Math.log10((totalCount + 1) * 2)));

      const getNewRandomCode = async (): Promise<string> => {
        const code = Math.floor(Math.random() * 10 ** codeLength)
          .toString()
          .padStart(codeLength, '0');

        if (
          await ctx.prisma.study.findUnique({
            where: {
              code,
            },
          })
        ) {
          return getNewRandomCode();
        }

        return code;
      };

      return ctx.prisma.study.create({
        data: {
          ...input.study,
          code: await getNewRandomCode(),
          introductionText: input.study.introductionText || '',
        },
      });
    }),
  get: protectedProcedure.input(z.string().uuid()).query(async ({ctx, input}) => {
    return ctx.prisma.study.findUnique({
      where: {
        id: input,
      },
      include: {
        folder: {
          orderBy: {
            order: 'asc',
          },
        },
        email: true,
      },
    });
  }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        study: z.object({
          name: z.string(),
          introductionText: z.string(),
          durationInMinutes: z.number(),
          folder: z.array(
            z.object({
              id: z.string().uuid().optional(),
              name: z.string(),
              order: z.number(),
              isPhishing: z.boolean(),
            }),
          ),
          email: z.array(
            z.object({
              id: z.string().uuid().optional(),
              emailId: z.string().uuid(),
              isPhishing: z.boolean(),
            }),
          ),
        }),
      }),
    )
    .mutation(async ({ctx, input}) => {
      const {folder, email, ...study} = input.study;

      return ctx.prisma.$transaction(async (tx) => {
        const currentStudy = await tx.study.findUniqueOrThrow({
          where: {
            id: input.id,
          },
          include: {
            folder: true,
            email: true,
          },
        });

        const foldersToDelete = currentStudy.folder.filter((f) => !folder.some((f2) => f2.id === f.id));
        const emailsToDelete = currentStudy.email.filter((e) => !email.some((f) => f.id === e.id));

        return ctx.prisma.study.update({
          where: {
            id: input.id,
          },
          data: {
            ...study,
            folder: {
              deleteMany: {
                id: {
                  in: foldersToDelete.map((f) => f.id),
                },
              },
              updateMany: folder
                .filter((f) => f.id)
                .map((f) => ({
                  where: {
                    id: f.id,
                  },
                  data: {
                    name: f.name,
                    order: f.order,
                    isPhishing: f.isPhishing,
                  },
                })),
              createMany: {
                data: folder
                  .filter((f) => !f.id)
                  .map((f) => ({
                    name: f.name,
                    order: f.order,
                    isPhishing: f.isPhishing,
                  })),
              },
            },
            email: {
              deleteMany: {
                id: {
                  in: emailsToDelete.map((e) => e.id),
                },
              },
              updateMany: email
                .filter((f) => f.id)
                .map((f) => ({
                  where: {
                    id: f.id,
                  },
                  data: {
                    emailId: f.emailId,
                    isPhishing: f.isPhishing,
                  },
                })),
              createMany: {
                data: email
                  .filter((f) => !f.id)
                  .map((f) => ({
                    emailId: f.emailId,
                    isPhishing: f.isPhishing,
                  })),
              },
            },
          },
        });
      });
    }),
  export: protectedProcedure.input(z.string().uuid()).mutation(async ({ctx, input}) => {
    const study = await ctx.prisma.study.findUnique({
      where: {
        id: input,
      },
      include: {
        folder: true,
        participation: {
          orderBy: {
            startedAt: 'asc',
          },
          include: {
            emails: {
              include: {
                email: true,
                events: {
                  orderBy: {
                    createdAt: 'asc',
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!study) {
      throw new Error('Study not found');
    }

    const folderMap = new Map(study.folder.map((f) => [f.id, f]));

    return study.participation.flatMap((p) => {
      const partipationExport = {
        'Participation-ID': p.id,
      };

      const emailsExport = p.emails.flatMap((e) => {
        const emailExport = {
          'Email-ID': e.emailId,
          'Email-Backoffice-ID': e.email.backofficeIdentifier,
        };

        return e.events.map((ev) => {
          const eventData = ev.data as ParticipationEvents;
          return {
            ...partipationExport,
            Type: eventData.type,
            At: ev.createdAt,
            ...emailExport,
            'Event-ID': ev.id,
            'From Folder': eventData.type === 'email-moved' ? folderMap.get(eventData.fromFolderId)?.name : null,
            'To Folder': eventData.type === 'email-moved' ? folderMap.get(eventData.toFolderId)?.name : null,
            'Scrolled To': eventData.type === 'email-scrolled' ? eventData.scrollPosition : null,
            URL: eventData.type === 'email-link-click' || eventData.type === 'email-link-hover' ? eventData.url : null,
            'Link Text':
              eventData.type === 'email-link-click' || eventData.type === 'email-link-hover'
                ? eventData.linkText
                : null,
          } as Record<string, unknown>;
        });
      });

      const emptyEvent = {
        'Email-ID': null,
        'Email-Backoffice-ID': null,
        'Event-ID': null,
        'From Folder': null,
        'To Folder': null,
        'Scrolled To': null,
        URL: null,
        'Link Text': null,
      };

      if (p.startedAt) {
        emailsExport.unshift({
          ...partipationExport,
          Type: 'started',
          At: p.startedAt,
          ...emptyEvent,
        });
      }

      emailsExport.unshift({
        ...partipationExport,
        Type: 'created',
        At: p.createdAt,
        ...emptyEvent,
      });

      if (p.finishedAt) {
        emailsExport.push({
          ...partipationExport,
          Type: 'finished',
          At: p.finishedAt,
          ...emptyEvent,
        });
      }

      return emailsExport;
    });
  }),
});
