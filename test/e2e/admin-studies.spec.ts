import {test, expect} from './fixtures';
import {login} from './helpers';
import {seedEmail, seedOpenStudy} from './seed';
import {randomUUID} from 'crypto';

test('admin can create a study with a folder and an email', async ({page, db}) => {
  const email = await seedEmail(db.prisma, {backofficeIdentifier: 'Phish-1'});
  await login(page);

  await page.goto('/admin/studies');
  await page.getByRole('link', {name: 'Create'}).click();
  await expect(page).toHaveURL(/\/admin\/studies\/create/);

  // Only the study name field exists at this point, so the bare label is safe.
  await page.getByLabel('Name').fill('Created Study');
  await page.getByLabel('External Images').selectOption({label: 'Always Hide'});

  // The folders and emails master-detail views are the two h-64 panels, in order.
  const folderPanel = page.locator('div.h-64').first();
  await folderPanel.getByRole('button', {name: 'Add'}).click();
  await folderPanel.getByRole('textbox').fill('Inbox folder');

  const emailPanel = page.locator('div.h-64').nth(1);
  await emailPanel.getByRole('button', {name: 'Add'}).click();
  await emailPanel.getByLabel('Email').selectOption({label: 'Phish-1'});

  await page.getByRole('button', {name: 'Save'}).click();

  await expect(page).toHaveURL(/\/admin\/studies$/);
  await expect(page.getByText('Created Study')).toBeVisible();

  const study = await db.prisma.study.findFirst({
    where: {name: 'Created Study'},
    include: {folder: true, email: true},
  });
  expect(study?.folder).toHaveLength(1);
  expect(study?.folder[0]?.name).toBe('Inbox folder');
  expect(study?.email).toHaveLength(1);
  expect(study?.email[0]?.emailId).toBe(email.id);
});

test('admin can edit a study name', async ({page, db}) => {
  const {studyId} = await db.seedParticipantStudy();
  await login(page);

  await page.goto('/admin/studies');
  await page.getByRole('link', {name: 'Edit'}).first().click();
  await expect(page).toHaveURL(new RegExp(`/admin/studies/${studyId}`));

  const name = page.getByLabel('Name');
  await expect(name).toHaveValue('E2E Teststudie');
  await name.fill('Renamed Study');
  await page.getByRole('button', {name: 'Save'}).click();

  await expect(page).toHaveURL(/\/admin\/studies$/);
  await expect(page.getByText('Renamed Study')).toBeVisible();
  expect((await db.prisma.study.findUnique({where: {id: studyId}}))?.name).toBe('Renamed Study');
});

test('admin can delete a study', async ({page, db}) => {
  await db.seedParticipantStudy();
  await login(page);

  await page.goto('/admin/studies');
  await expect(page.getByText('E2E Teststudie')).toBeVisible();
  await page.getByRole('button', {name: 'Delete'}).first().click();
  await page.getByRole('button', {name: 'Continue'}).click();

  await expect(page.getByText('E2E Teststudie')).toHaveCount(0);
  expect(await db.prisma.study.count()).toBe(0);
});

test('admin can export participant data as CSV', async ({page, db}) => {
  await db.seedParticipantStudy();
  await login(page);

  await page.goto('/admin/studies');
  await page.getByRole('button', {name: 'Export'}).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByText('Participants Data for analysis').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('export.csv');
});

test('admin can export the study structure as JSON', async ({page, db}) => {
  await db.seedParticipantStudy();
  await login(page);

  await page.goto('/admin/studies');
  await page.getByRole('button', {name: 'Export'}).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByText('Structure of Study for import').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.export\.json$/);
});

test('admin can import a study from a JSON file', async ({page, db}) => {
  await login(page);
  await page.goto('/admin/studies');

  const studyId = randomUUID();
  const studyJson = {
    id: studyId,
    name: 'Imported Study',
    timerMode: 'VISIBLE',
    externalImageMode: 'HIDE',
    durationInMinutes: 5,
    startText: 'Start',
    endText: 'End',
    folder: [{id: randomUUID(), name: 'Imported Folder', order: 0}],
    email: [
      {
        id: randomUUID(),
        senderMail: 'a@b.com',
        senderName: 'A',
        subject: 'S',
        headers: 'H',
        body: 'B',
        allowExternalImages: false,
        backofficeIdentifier: 'Imported-Email',
        order: 0,
      },
    ],
  };

  await page.locator('input[type="file"]').setInputFiles({
    name: 'study.export.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(studyJson)),
  });

  await expect(page.getByText('Imported Study')).toBeVisible();
  const study = await db.prisma.study.findUnique({
    where: {id: studyId},
    include: {folder: true, email: true},
  });
  expect(study?.folder).toHaveLength(1);
  expect(study?.email).toHaveLength(1);
});

test('admin can reorder, select and remove folders in the master-detail view', async ({page, db}) => {
  await login(page);
  await page.goto('/admin/studies');
  await page.getByRole('link', {name: 'Create'}).click();
  await expect(page).toHaveURL(/\/admin\/studies\/create/);

  await page.getByLabel('Name').fill('MDV Study');
  await page.getByLabel('External Images').selectOption({label: 'Always Hide'});

  const folderPanel = page.locator('div.h-64').first();
  const addFolder = (name: string) => async () => {
    await folderPanel.getByRole('button', {name: 'Add'}).click();
    await folderPanel.getByRole('textbox').fill(name);
  };
  // Each list row carries its label plus aria-labelled reorder buttons.
  const rowFor = (name: string) => folderPanel.locator('div.overflow-y-auto > div', {hasText: name});
  const moveUp = (name: string) => rowFor(name).getByRole('button', {name: 'Move up'}).click();
  const moveDown = (name: string) => rowFor(name).getByRole('button', {name: 'Move down'}).click();

  // Adding then removing a single folder exercises the "remove the last item"
  // path which clears the selection back to the placeholder.
  await (addFolder('Temp'))();
  await folderPanel.getByRole('button', {name: 'Remove'}).click();
  await expect(folderPanel.getByText('Select an element')).toBeVisible();

  await (addFolder('Alpha'))();
  await (addFolder('Beta'))();
  await (addFolder('Gamma'))();

  // Select the first folder, then shuffle it down and back up; the selection
  // must follow the moved item each time.
  await folderPanel.getByRole('button', {name: 'Alpha', exact: true}).click();
  await moveDown('Alpha'); // -> Beta, Alpha, Gamma
  await moveUp('Alpha'); // -> Alpha, Beta, Gamma (selection still on Alpha)

  // Removing the still-selected first folder keeps a sibling selected.
  await folderPanel.getByRole('button', {name: 'Remove'}).click();

  // Pressing Enter inside the panel must not submit the surrounding form.
  await folderPanel.getByRole('textbox').press('Enter');
  await expect(page).toHaveURL(/\/admin\/studies\/create/);

  await page.getByRole('button', {name: 'Save'}).click();
  await expect(page).toHaveURL(/\/admin\/studies$/);

  const study = await db.prisma.study.findFirst({
    where: {name: 'MDV Study'},
    include: {folder: {orderBy: {order: 'asc'}}},
  });
  expect(study?.folder.map((f) => f.name)).toEqual(['Beta', 'Gamma']);
});

test('admin can generate additional participation codes for a study', async ({page, db}) => {
  const {studyId} = await seedOpenStudy(db.prisma, true);
  await login(page);

  await page.goto(`/admin/studies/${studyId}`);
  await expect(page.getByRole('heading', {name: 'Participants', exact: true})).toBeVisible();

  // Submitting the "Add More Participants" form mints the requested codes.
  const amount = page.getByLabel('Amount');
  await amount.fill('3');
  await amount.press('Enter');

  await expect.poll(() => db.prisma.participation.count({where: {studyId}})).toBe(3);
});

test('an open study shows the shared participation link', async ({page, db}) => {
  const {studyId} = await seedOpenStudy(db.prisma, true);
  await login(page);

  await page.goto(`/admin/studies/${studyId}`);

  await expect(page.getByLabel('Link for open participation')).toHaveValue(new RegExp(`/new/${studyId}$`));
});
