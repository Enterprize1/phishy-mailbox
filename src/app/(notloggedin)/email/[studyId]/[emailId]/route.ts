import {prisma} from '~/server/db';
import {ExternalImageMode} from '@prisma/client';

export async function GET(
  request: Request,
  {params: {studyId, emailId}}: {params: {studyId: string; emailId: string}},
) {
  const url = new URL(request.url);
  const email = await prisma.email.findUnique({
    where: {
      id: emailId,
    },
    include: {
      StudyEmail: {
        where: {
          studyId: studyId,
        },
        include: {
          study: true,
        },
      },
    },
  });

  if (!email) {
    return Response.json(false);
  }

  if (email.StudyEmail.length === 0) {
    return Response.json(false);
  }

  const withExternalImages =
    email.allowExternalImages &&
    email.StudyEmail[0].study.externalImageMode !== ExternalImageMode.HIDE &&
    url.searchParams.get('showExternalImages') === 'true';

  return new Response(email.body, {
    headers: {
      'Content-Security-Policy':
        "default-src 'none'; style-src 'unsafe-inline'; navigate-to 'none';" +
        (withExternalImages ? ' img-src https: data:;' : ''),
      'Content-Type': 'text/html',
    },
  });
}
