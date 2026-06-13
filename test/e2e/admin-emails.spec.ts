import {test, expect} from './fixtures';
import {login} from './helpers';
import {seedEmail} from './seed';

const SAMPLE_EML = [
  'From: Jane Doe <jane@example.com>',
  'To: you@example.com',
  'Subject: Hello EML',
  'Content-Type: text/html; charset=utf-8',
  '',
  '<p>Hello <a href="https://example.com">link</a></p>',
].join('\r\n');

test('admin can upload an .eml file and save the parsed email', async ({page, db}) => {
  await login(page);
  await page.goto('/admin/emails/create');

  await page.locator('input[type="file"]').setInputFiles({
    name: 'sample.eml',
    mimeType: 'message/rfc822',
    buffer: Buffer.from(SAMPLE_EML),
  });

  // Parsing resets the form with the extracted values.
  await expect(page.getByLabel('Subject')).toHaveValue('Hello EML');
  await expect(page.getByLabel('Identifier in the Back Office')).toHaveValue('Hello EML / Jane Doe');

  await page.getByRole('button', {name: 'Save'}).click();
  await expect(page).toHaveURL(/\/admin\/emails$/);
  await expect(page.getByText('Hello EML / Jane Doe')).toBeVisible();

  const email = await db.prisma.email.findFirst({where: {subject: 'Hello EML'}});
  expect(email?.senderMail).toBe('jane@example.com');
  expect(email?.senderName).toBe('Jane Doe');
});

test('admin can bulk-upload .eml files from the list page', async ({page, db}) => {
  await login(page);
  await page.goto('/admin/emails');

  await page.locator('input[type="file"]').setInputFiles({
    name: 'sample.eml',
    mimeType: 'message/rfc822',
    buffer: Buffer.from(SAMPLE_EML),
  });

  await expect(page.getByText('Hello EML / Jane Doe')).toBeVisible();
  expect(await db.prisma.email.count()).toBe(1);
});

test('admin can edit an email identifier', async ({page, db}) => {
  const email = await seedEmail(db.prisma, {backofficeIdentifier: 'Old-Id'});
  await login(page);

  await page.goto('/admin/emails');
  await page.getByRole('link', {name: 'Edit'}).first().click();

  const identifier = page.getByLabel('Identifier in the Back Office');
  await expect(identifier).toHaveValue('Old-Id');
  await identifier.fill('New-Id');
  await page.getByRole('button', {name: 'Save'}).click();

  await expect(page).toHaveURL(/\/admin\/emails$/);
  await expect(page.getByText('New-Id')).toBeVisible();
  expect((await db.prisma.email.findUnique({where: {id: email.id}}))?.backofficeIdentifier).toBe('New-Id');
});

test('admin can delete an unused email', async ({page, db}) => {
  await seedEmail(db.prisma, {backofficeIdentifier: 'Deletable'});
  await login(page);

  await page.goto('/admin/emails');
  await page.getByRole('button', {name: 'Delete'}).first().click();
  await page.getByRole('button', {name: 'Continue'}).click();

  await expect(page.getByText('Deletable')).toHaveCount(0);
  expect(await db.prisma.email.count()).toBe(0);
});

test('deleting an email used in a study is rejected', async ({page, db}) => {
  // seedParticipantStudy wires two emails into a study, so deletion must fail.
  await db.seedParticipantStudy();
  await login(page);

  await page.goto('/admin/emails');
  await page.getByRole('button', {name: 'Delete'}).first().click();
  await page.getByRole('button', {name: 'Continue'}).click();

  await expect(page.getByText('could not be deleted')).toBeVisible();
  expect(await db.prisma.email.count()).toBe(2);
});
