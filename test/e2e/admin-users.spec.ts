import {test, expect} from './fixtures';
import {login} from './helpers';
import {seedUser} from './seed';

test('admin can create a user', async ({page, db}) => {
  await login(page);

  await page.goto('/admin/users');
  await page.getByRole('link', {name: 'Create'}).click();
  await page.getByLabel('Email').fill('new@example.com');
  await page.getByLabel('Password').fill('secret123');
  await page.getByRole('button', {name: 'Save'}).click();

  await expect(page).toHaveURL(/\/admin\/users$/);
  await expect(page.getByText('new@example.com')).toBeVisible();
  expect(await db.prisma.user.findUnique({where: {email: 'new@example.com'}})).not.toBeNull();
});

test('admin can edit another user', async ({page, db}) => {
  await seedUser(db.prisma, {email: 'edit@example.com'});
  await login(page);

  await page.goto('/admin/users');
  await page
    .getByRole('row', {name: /edit@example\.com/})
    .getByRole('link', {name: 'Edit'})
    .click();

  const emailField = page.getByLabel('Email');
  await expect(emailField).toHaveValue('edit@example.com');
  await emailField.fill('edited@example.com');
  await page.getByRole('button', {name: 'Save'}).click();

  await expect(page).toHaveURL(/\/admin\/users$/);
  await expect(page.getByText('edited@example.com')).toBeVisible();
  expect(await db.prisma.user.findUnique({where: {email: 'edited@example.com'}})).not.toBeNull();
});

test('admin can delete another user', async ({page, db}) => {
  await seedUser(db.prisma, {email: 'gone@example.com'});
  await login(page);

  await page.goto('/admin/users');
  await page
    .getByRole('row', {name: /gone@example\.com/})
    .getByRole('button', {name: 'Delete'})
    .click();
  await page.getByRole('button', {name: 'Continue'}).click();

  await expect(page.getByText('gone@example.com')).toHaveCount(0);
  expect(await db.prisma.user.findUnique({where: {email: 'gone@example.com'}})).toBeNull();
});

test('admin cannot delete themselves', async ({page, db}) => {
  await login(page);

  await page.goto('/admin/users');
  await page
    .getByRole('row', {name: /admin@example\.com/})
    .getByRole('button', {name: 'Delete'})
    .click();
  await page.getByRole('button', {name: 'Continue'}).click();

  await expect(page.getByText('could not be deleted')).toBeVisible();
  // The admin is the only seeded user and must survive the attempt.
  expect(await db.prisma.user.findUnique({where: {email: 'admin@example.com'}})).not.toBeNull();
});
