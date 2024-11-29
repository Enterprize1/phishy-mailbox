import {prisma} from '~/server/db';
import {createNewParticipation} from '~/server/api/routers/participation';
import {redirect} from 'next/navigation';

export async function GET(_request: Request, props: {params: Promise<{studyId: string}>}) {
  const params = await props.params;

  const {
    studyId
  } = params;

  const study = await prisma.study.findUnique({
    where: {
      id: studyId,
    },
  });

  if (!study) {
    redirect('/');
  }

  if (!study.openParticipation) {
    redirect('/');
  }

  const {code} = await createNewParticipation(prisma, study.id);

  redirect('/' + code);
}
