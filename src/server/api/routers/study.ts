import {createTRPCRouter, protectedProcedure} from '~/server/api/trpc';
import {z} from 'zod';
import {ParticipationEvents} from '~/server/api/routers/participationEvents';
import DOMPurify from 'isomorphic-dompurify';

const studyShape = z.object({
  name: z.string(),
  openParticipation: z.boolean().default(false),
  consentRequired: z.boolean().default(false),
  consentText: z.string().optional().nullable().default(''),
  timerMode: z.enum(['DISABLED', 'HIDDEN', 'VISIBLE']).default('VISIBLE'),
  externalImageMode: z.enum(['ASK', 'HIDE', 'SHOW']).default('HIDE'),
  durationInMinutes: z.number().optional().nullable(),
  startText: z.string().default(''),
  startLinkTemplate: z.string().optional().nullable(),
  endText: z.string().default(''),
  endLinkTemplate: z.string().optional().nullable(),
});

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
        study: studyShape.and(
          z.object({
            folder: z.array(
              z.object({
                name: z.string(),
                order: z.number().optional(),
              }),
            ),
            email: z.array(
              z.object({
                emailId: z.string().nullable(),
                order: z.number().optional(),
              }),
            ),
          }),
        ),
      }),
    )
    .mutation(async ({ctx, input}) => {
      const {folder, email, ...data} = input.study;

      return ctx.prisma.study.create({
        data: {
          ...data,
          startText: DOMPurify.sanitize(data.startText),
          endText: DOMPurify.sanitize(data.endText),
          consentText: DOMPurify.sanitize(data.consentText ?? ''),
          folder: {
            createMany: {
              data: folder.map((f, i) => ({name: f.name, order: i})),
            },
          },
          email: {
            createMany: {
              data: email
                .filter((e): e is {emailId: string} => !!e.emailId)
                .map((f, i) => ({
                  emailId: f.emailId,
                  order: i,
                })),
            },
          },
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
        email: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
  }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        study: studyShape.and(
          z.object({
            folder: z.array(
              z.object({
                id: z.string().uuid().optional(),
                name: z.string(),
                order: z.number(),
              }),
            ),
            email: z.array(
              z.object({
                id: z.string().uuid().optional(),
                emailId: z.string().uuid(),
                order: z.number(),
              }),
            ),
          }),
        ),
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
        const folderWithOrder = folder.map((f, order) => ({...f, order}));

        return ctx.prisma.study.update({
          where: {
            id: input.id,
          },
          data: {
            ...study,
            startText: DOMPurify.sanitize(study.startText),
            endText: DOMPurify.sanitize(study.endText),
            consentText: DOMPurify.sanitize(study.consentText ?? ''),
            folder: {
              deleteMany: {
                id: {
                  in: foldersToDelete.map((f) => f.id),
                },
              },
              updateMany: folderWithOrder
                .filter((f) => f.id)
                .map((f) => ({
                  where: {
                    id: f.id,
                  },
                  data: {
                    name: f.name,
                    order: folder.findIndex((f2) => f2.id === f.id),
                  },
                })),
              createMany: {
                data: folderWithOrder
                  .filter((f) => !f.id)
                  .map((f) => ({
                    name: f.name,
                    order: folder.findIndex((f2) => f2.id === f.id),
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
                    order: email.findIndex((e) => e.id === f.id),
                  },
                })),
              createMany: {
                data: email
                  .filter((f) => !f.id)
                  .map((f) => ({
                    emailId: f.emailId,
                    order: email.findIndex((e) => e.id === f.id),
                  })),
              },
            },
          },
        });
      });
    }),
  delete: protectedProcedure.input(z.string().uuid()).mutation(async ({ctx, input}) => {
    const study = await ctx.prisma.study.findUnique({
      where: {
        id: input,
      },
      include: {
        folder: true,
        email: true,
        participation: {
          include: {
            emails: {
              include: {
                events: true,
              },
            },
          },
        },
      },
    });

    if (!study) {
      throw new Error('Study not found');
    }

    return ctx.prisma.$transaction(async (tx) => {
      await tx.participationEmailEvent.deleteMany({
        where: {
          id: {
            in: study.participation.flatMap((p) => p.emails.flatMap((e) => e.events.map((ev) => ev.id))),
          },
        },
      });

      await tx.participationEmail.deleteMany({
        where: {
          id: {
            in: study.participation.flatMap((p) => p.emails.map((e) => e.id)),
          },
        },
      });

      await tx.participation.deleteMany({
        where: {
          id: {
            in: study.participation.map((p) => p.id),
          },
        },
      });

      await tx.folder.deleteMany({
        where: {
          id: {
            in: study.folder.map((f) => f.id),
          },
        },
      });

      await tx.studyEmail.deleteMany({
        where: {
          id: {
            in: study.email.map((e) => e.id),
          },
        },
      });

      await tx.study.delete({
        where: {
          id: input,
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
        Code: p.code,
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

      if (p.startLinkClickedAt) {
        emailsExport.unshift({
          ...partipationExport,
          Type: 'start-link-clicked',
          At: p.startLinkClickedAt,
          ...emptyEvent,
        });
      }

      if (p.codeUsedAt) {
        emailsExport.unshift({
          ...partipationExport,
          Type: 'code-used',
          At: p.codeUsedAt,
          ...emptyEvent,
        });
      }

      if (p.consentGivenAt) {
        emailsExport.unshift({
          ...partipationExport,
          Type: 'consent-given',
          At: p.consentGivenAt,
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

      if (p.endLinkClickedAt) {
        emailsExport.push({
          ...partipationExport,
          Type: 'end-link-clicked',
          At: p.endLinkClickedAt,
          ...emptyEvent,
        });
      }

      return emailsExport;
    });
  }),
  exportStudyStructure: protectedProcedure.input(z.string().uuid()).mutation(async ({ctx, input}) => {
    const study = await ctx.prisma.study.findUnique({
      where: {
        id: input,
      },
      include: {
        folder: true,
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

    return {
      ...study,
      folder: study.folder.map((f) => {
        const {studyId, ...folder} = f;

        return {
          ...folder,
        };
      }),
      email: study.email.map((e) => ({
        ...e.email,
        order: e.order,
      })),
    };
  }),
  importStudy: protectedProcedure
    .input(
      studyShape.and(
        z.object({
          id: z.string().uuid(),
          folder: z.array(
            z.object({
              id: z.string().uuid(),
              name: z.string(),
              order: z.number(),
            }),
          ),
          email: z.array(
            z.object({
              id: z.string().uuid(),
              senderMail: z.string(),
              senderName: z.string(),
              subject: z.string(),
              headers: z.string(),
              body: z.string(),
              allowExternalImages: z.boolean(),
              backofficeIdentifier: z.string(),
              order: z.number().optional(),
            }),
          ),
        }),
      ),
    )
    .mutation(async ({ctx, input}) => {
      return ctx.prisma.$transaction(async (tx) => {
        const study = await tx.study.upsert({
          where: {
            id: input.id,
          },
          update: {
            name: input.name,
            durationInMinutes: input.durationInMinutes,
            startText: input.startText,
            startLinkTemplate: input.startLinkTemplate,
            endText: input.endText,
            endLinkTemplate: input.endLinkTemplate,
          },
          create: {
            id: input.id,
            name: input.name,
            durationInMinutes: input.durationInMinutes,
            startText: input.startText,
            startLinkTemplate: input.startLinkTemplate,
            endText: input.endText,
            endLinkTemplate: input.endLinkTemplate,
          },
          select: {
            id: true,
            folder: true,
            email: true,
          },
        });

        await tx.folder.deleteMany({
          where: {
            studyId: study.id,
            id: {
              notIn: input.folder.map((f) => f.id),
            },
          },
        });

        for (const folder of input.folder) {
          await tx.folder.upsert({
            where: {
              id: folder.id,
            },
            update: {
              ...folder,
              studyId: study.id,
            },
            create: {
              ...folder,
              studyId: study.id,
            },
          });
        }

        for (const email of input.email) {
          const {order, ...withoutOrder} = email;
          await tx.email.upsert({
            where: {
              id: email.id,
            },
            update: withoutOrder,
            create: withoutOrder,
          });
        }

        await tx.studyEmail.deleteMany({
          where: {
            studyId: study.id,
            emailId: {
              notIn: input.email.map((e) => e.id),
            },
          },
        });

        for (const email of input.email) {
          await tx.studyEmail.upsert({
            where: {
              studyId_emailId: {
                studyId: study.id,
                emailId: email.id,
              },
            },
            update: {
              order: email.order,
            },
            create: {
              studyId: study.id,
              emailId: email.id,
              order: email.order,
            },
          });
        }
      });
    }),
});
