import {test, expect} from './fixtures';
import {seedOpenStudy} from './seed';
import {randomUUID} from 'crypto';

test('visiting /new for an open study mints a code and starts a participation', async ({page, db}) => {
  const {studyId} = await seedOpenStudy(db.prisma, true);

  await page.goto('/new/' + studyId);

  // The route generates a fresh code and redirects to the participant page.
  await expect(page).toHaveURL(/\/\d+$/);
  await expect(page.getByRole('button', {name: 'Study Introduction'})).toBeVisible();

  const participation = await db.prisma.participation.findFirst({where: {studyId}});
  expect(participation).not.toBeNull();
  // The minted code is what the URL ended up on.
  expect(page.url()).toMatch(new RegExp(`/${participation!.code}$`));
});

test('visiting /new for a closed study redirects to the start page', async ({page, db}) => {
  const {studyId} = await seedOpenStudy(db.prisma, false);

  await page.goto('/new/' + studyId);

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel('Access Code')).toBeVisible();
  // No participation is created for a closed study.
  expect(await db.prisma.participation.count()).toBe(0);
});

test('visiting /new for an unknown study redirects to the start page', async ({page, db}) => {
  void db;
  await page.goto('/new/' + randomUUID());

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel('Access Code')).toBeVisible();
});
