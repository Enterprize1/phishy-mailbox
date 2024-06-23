import {createTRPCRouter, publicProcedure} from '~/server/api/trpc';
import {z} from 'zod';

export const eMailViewEvent = z.object({
  type: z.literal('email-view'),
});
export type EMailViewEvent = z.infer<typeof eMailViewEvent>;

export const eMailViewDetailsEvent = z.object({
  type: z.literal('email-details-view'),
});
export type EMailViewDetailsEvent = z.infer<typeof eMailViewDetailsEvent>;

export const eMailViewExternalImagesEvent = z.object({
  type: z.literal('email-external-images-view'),
});
export type EMailViewExternalImagesEvent = z.infer<typeof eMailViewExternalImagesEvent>;

export const eMailMovedEvent = z.object({
  type: z.literal('email-moved'),
  fromFolderId: z.string().uuid(),
  toFolderId: z.string().uuid(),
});
export type EMailMovedEvent = z.infer<typeof eMailMovedEvent>;

export const eMailScrolledEvent = z.object({
  type: z.literal('email-scrolled'),
  scrollPosition: z.number(),
});
export type EMailScrolledEvent = z.infer<typeof eMailScrolledEvent>;

export const eMailLinkClickEvent = z.object({
  type: z.literal('email-link-click'),
  url: z.string().url(),
  linkText: z.string(),
});
export type EMailLinkClickEvent = z.infer<typeof eMailLinkClickEvent>;

export const eMailLinkHoverEvent = z.object({
  type: z.literal('email-link-hover'),
  url: z.string().url(),
  linkText: z.string(),
});
export type EMailLinkHoverEvent = z.infer<typeof eMailLinkHoverEvent>;

export const participationEvents = z.union([
  eMailViewEvent,
  eMailViewDetailsEvent,
  eMailViewExternalImagesEvent,
  eMailMovedEvent,
  eMailScrolledEvent,
  eMailLinkClickEvent,
  eMailLinkHoverEvent,
]);
export type ParticipationEvents = z.infer<typeof participationEvents>;

export const participationEventRouter = createTRPCRouter({
  track: publicProcedure
    .input(
      z.object({
        participationId: z.string().uuid(),
        participationEmailId: z.string().uuid(),
        event: participationEvents,
      }),
    )
    .mutation(async ({ctx, input}) => {
      const participation = await ctx.prisma.participation.findUnique({
        where: {
          id: input.participationId,
        },
        include: {
          emails: {
            where: {
              id: input.participationEmailId,
            },
          },
        },
      });

      if (!participation?.emails[0]) {
        throw new Error('Participation E-Mail not found');
      }

      return ctx.prisma.participationEmailEvent.create({
        data: {
          participationEmailId: input.participationEmailId,
          createdAt: new Date(),
          data: input.event,
        },
      });
    }),
});
