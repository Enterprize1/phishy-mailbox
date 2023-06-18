import {z} from 'zod';
import {createTRPCRouter, protectedProcedure} from '~/server/api/trpc';
import {Readable} from 'stream';
import EmlParser from 'eml-parser';
import {Email} from '@prisma/client';

export const emailRouter = createTRPCRouter({
  getAll: protectedProcedure.query(({ctx}) => {
    return ctx.prisma.email.findMany();
  }),
  parseFile: protectedProcedure
    .input(z.object({file: z.string()}))
    .mutation(async ({input}): Promise<Partial<Email>> => {
      const buffer = Buffer.from(input.file.split(',')[1], 'base64');
      const readable = Readable.from(buffer);
      const parser = new EmlParser(readable);

      const parsed = await parser.parseEml();

      // TODO: Types seem to be wrong here
      const headers = (parsed.headerLines as unknown as {line: string}[]).map((h) => h.line).join('\n');

      return {
        senderMail: parsed.from.value[0].address,
        senderName: parsed.from.value[0].name,
        headers,
        subject: parsed.subject,
        body: parsed.html,
      };
    }),
  add: protectedProcedure
    .input(
      z.object({
        email: z.object({
          senderMail: z.string(),
          senderName: z.string(),
          subject: z.string(),
          headers: z.string(),
          body: z.string(),
          backofficeIdentifier: z.string(),
        }),
      }),
    )
    .mutation(async ({ctx, input}) => {
      return ctx.prisma.email.create({
        data: input.email,
      });
    }),
  get: protectedProcedure.input(z.string().uuid()).query(async ({ctx, input}) => {
    return ctx.prisma.email.findUnique({
      where: {
        id: input,
      },
    });
  }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        email: z.object({
          senderMail: z.string(),
          senderName: z.string(),
          subject: z.string(),
          headers: z.string(),
          body: z.string(),
          backofficeIdentifier: z.string(),
        }),
      }),
    )
    .mutation(async ({ctx, input}) => {
      return ctx.prisma.email.update({
        where: {
          id: input.id,
        },
        data: input.email,
      });
    }),
});
