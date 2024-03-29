import {createTRPCRouter} from '~/server/api/trpc';
import {studyRouter} from '~/server/api/routers/study';
import {emailRouter} from '~/server/api/routers/email';
import {participationRouter} from '~/server/api/routers/participation';
import {participationEventRouter} from '~/server/api/routers/participationEvents';
import {userRouter} from '~/server/api/routers/user';

export const appRouter = createTRPCRouter({
  study: studyRouter,
  email: emailRouter,
  participation: participationRouter,
  participationEvent: participationEventRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
