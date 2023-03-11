import {type GetServerSidePropsContext} from 'next';
import {getServerSession, type NextAuthOptions} from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import * as z from 'zod';
import * as bcrypt from 'bcrypt';
import {PrismaClient} from '@prisma/client';

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
/*declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession['user'];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}*/

const db = new PrismaClient();

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  callbacks: {
    jwt: async ({token, user}) => {
      if (user) {
        token.id = user.id;
      }

      return token;
    },
    session: async ({session, token}) => {
      if (token && typeof token.id === 'string') {
        const user = await db.user.findUnique({
          where: {
            id: token.id,
          },
        });

        if (user) {
          session.user = {
            email: user.email,
          };
        } else {
          session.user = undefined;
        }
      }

      return session;
    },
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: {type: 'email'},
        password: {type: 'password'},
      },
      authorize: async (credentials) => {
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string(),
          })
          .parse(credentials);

        const user = await db.user.findUnique({
          where: {
            email: parsedCredentials.email,
          },
        });

        if (!user || !(await bcrypt.compare(parsedCredentials.password, user.password))) {
          return null;
        }

        return user;
      },
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],

  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: '3DMCYKQ98xwJr+nCYFkq9PPGCre1vOfHFj2pzFJm08g=',
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext['req'];
  res: GetServerSidePropsContext['res'];
}) => {
  return getServerSession(ctx.req, ctx.res, authOptions);
};
