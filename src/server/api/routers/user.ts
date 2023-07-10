import {z} from 'zod';
import {createTRPCRouter, protectedProcedure} from '~/server/api/trpc';
import {TRPCError} from '@trpc/server';
import bcrypt from 'bcrypt';

export const userRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ctx}) => {
    return (await ctx.prisma.user.findMany()).map((user) => {
      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      };
    });
  }),
  get: protectedProcedure.input(z.string().uuid()).query(async ({ctx, input}) => {
    const user = await ctx.prisma.user.findUnique({
      where: {
        id: input,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    };
  }),
  add: protectedProcedure
    .input(
      z.object({
        email: z.string(),
        password: z.string(),
      }),
    )
    .mutation(async ({ctx, input}) => {
      return ctx.prisma.user.create({
        data: {
          email: input.email,
          password: await bcrypt.hash(input.password, 10),
          created_at: new Date(),
        },
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        email: z.string(),
        password: z.string(),
      }),
    )
    .mutation(async ({ctx, input}) => {
      return ctx.prisma.user.update({
        where: {
          id: input.id,
        },
        data: {
          email: input.email,
          ...(input.password ? {password: await bcrypt.hash(input.password, 10)} : {}), // Only update password if it's provided (otherwise it will be set to null
        },
      });
    }),
  delete: protectedProcedure.input(z.string().uuid()).mutation(async ({ctx, input}) => {
    const user = await ctx.prisma.user.findUnique({
      where: {
        id: input,
      },
    });

    if (user?.email === ctx.session.user.email) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You cannot delete yourself',
      });
    }

    return ctx.prisma.user.delete({
      where: {
        id: input,
      },
    });
  }),
});
