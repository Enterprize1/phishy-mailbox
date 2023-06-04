import {createTRPCRouter} from '~/server/api/trpc';
import {studyRouter} from '~/server/api/routers/study';
import {emailRouter} from '~/server/api/routers/email';
import {participationRouter} from '~/server/api/routers/participation';
import {participationEventRouter} from '~/server/api/routers/participationEvents';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  study: studyRouter,
  email: emailRouter,
  participation: participationRouter,
  participationEvent: participationEventRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
