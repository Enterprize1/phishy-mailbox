export {};
/*
import {z} from 'zod';
import {procedure, router} from '../trpc';
import * as bcrypt from 'bcrypt';
import {PrismaClient} from '@prisma/client';

const db = new PrismaClient();

export const appRouter = router({
  login: procedure
    .input(
      z.object({
        email: z.string(),
        password: z.string(),
      }),
    )
    .mutation(async ({input}) => {
      const user = await db.user.findUnique({
        where: {
          email: input.email,
        },
      });

      if (!user || !(await bcrypt.compare(input.password, user.password))) {
        return false;
      }

      // TODO: Login, set cookie

      return true;
    }),
  emails: procedure.query(async () => {
    return db.email.findMany();
  }),
  email: procedure
    .input(
      z.object({
        id: z.string().uuid(),
      }),
    )
    .query(async ({input}) => {
      return db.email.findUnique({
        where: {
          id: input.id,
        },
      });
    }),
  studies: procedure.query(async () => {
    return db.study.findMany();
  }),
  participants: procedure.query(async () => {
    return db.participation.findMany();
  }),
});
*/
