import {prisma} from '~/server/db';
import {createNewParticipation} from '~/server/api/routers/participation';

export async function GET(request: Request, {params: {studyId}}: {params: {studyId: string}}) {
  const url = new URL(request.url);
  const study = await prisma.study.findUnique({
    where: {
      id: studyId,
    },
  });

  if (!study) {
    return Response.redirect(url.origin + '/');
  }

  if (!study.openParticipation) {
    return Response.redirect(url.origin + '/');
  }

  const {code} = await createNewParticipation(prisma, study.id);

  return Response.redirect(url.origin + '/' + code);
}
