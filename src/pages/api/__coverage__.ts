import type {NextApiRequest, NextApiResponse} from 'next';

// Exposes the server process's Istanbul coverage object so the e2e suite can
// collect it after a run. Only active when the app was built with COVERAGE=1
// (see scripts/e2e-coverage.mjs); a normal production build returns 404, so the
// route is inert in real deployments even though the file is always shipped.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.COVERAGE !== '1') {
    res.status(404).end();
    return;
  }

  res.status(200).json((globalThis as {__coverage__?: unknown}).__coverage__ ?? null);
}
