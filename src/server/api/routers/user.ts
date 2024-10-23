import {z} from 'zod';
import {createTRPCRouter, protectedProcedure} from '~/server/api/trpc';
import {TRPCError} from '@trpc/server';
import bcrypt from 'bcrypt';

export const userRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ctx}) => {
    const currentUser = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.name! }
    });

    if (!currentUser?.canManageUsers) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to manage users',
      });
    }

    return (await ctx.prisma.user.findMany()).map((user) => {
      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        canManageUsers: user.canManageUsers,
      };
    });
  }),
  get: protectedProcedure.input(z.string().uuid()).query(async ({ctx, input}) => {
    const currentUser = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.name! }
    });

    // Allow viewing own user or require canManageUsers permission
    if (input !== ctx.session.user.name && !currentUser?.canManageUsers) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to manage users',
      });
    }
    
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
      canManageUsers: user.canManageUsers,
    };
  }),
  add: protectedProcedure
    .input(
      z.object({
        email: z.string(),
        password: z.string(),
        canManageUsers: z.boolean(),
      }),
    )
    .mutation(async ({ctx, input}) => {
      const currentUser = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.name! }
      });

      if (!currentUser?.canManageUsers) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to manage users',
        });
      }

      return ctx.prisma.user.create({
        data: {
          email: input.email,
          password: await bcrypt.hash(input.password, 10),
          created_at: new Date(),
          canManageUsers: input.canManageUsers,
        },
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        email: z.string(),
        password: z.string(),
        canManageUsers: z.boolean(),
      }),
    )
    .mutation(async ({ctx, input}) => {
      const currentUser = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.name! }
      });

      if (!currentUser?.canManageUsers) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to manage users',
        });
      }

      // Don't allow changing own manage users permission
      if (input.id === ctx.session.user.name) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot modify your own user management permissions',
        });
      }

      return ctx.prisma.user.update({
        where: {
          id: input.id,
        },
        data: {
          email: input.email,
          canManageUsers: input.canManageUsers,
          ...(input.password ? {password: await bcrypt.hash(input.password, 10)} : {}), // Only update password if it's provided (otherwise it will be set to null
        },
      });
    }),
  delete: protectedProcedure.input(z.string().uuid()).mutation(async ({ctx, input}) => {
    const currentUser = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.name! }
    });

    if (!currentUser?.canManageUsers) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to manage users',
      });
    }

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
