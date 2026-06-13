import {test, expect} from './fixtures';
import {login} from './helpers';
import {ADMIN_EMAIL, ADMIN_PASSWORD} from './seed';
import * as bcrypt from 'bcrypt';

test('admin can change their own password via the user menu', async ({page, db}) => {
  await login(page);

  await page.getByRole('button', {name: 'Open User Menu'}).click();
  await page.getByRole('menuitem', {name: 'Change Password'}).click();

  // "Change Password" routes to the current admin's own edit page.
  await expect(page).toHaveURL(/\/admin\/users\/.+/);
  await expect(page.getByLabel('Email')).toHaveValue(ADMIN_EMAIL);

  const newPassword = 'new-password-789';
  await page.getByLabel('Password').fill(newPassword);
  await page.getByRole('button', {name: 'Save'}).click();

  await expect(page).toHaveURL(/\/admin\/users$/);

  // The stored hash now matches the new password and no longer the old one.
  const user = await db.prisma.user.findUnique({where: {email: ADMIN_EMAIL}});
  expect(user).not.toBeNull();
  expect(await bcrypt.compare(newPassword, user!.password)).toBe(true);
  expect(await bcrypt.compare(ADMIN_PASSWORD, user!.password)).toBe(false);

  // And the new password actually works for a fresh sign-in.
  await page.getByRole('button', {name: 'Open User Menu'}).click();
  await page.getByRole('menuitem', {name: 'Sign Out'}).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(newPassword);
  await page.getByRole('button', {name: 'Sign In'}).click();
  await expect(page).toHaveURL(/\/admin\/emails/);
});

test('leaving the password blank keeps the current password', async ({page, db}) => {
  await login(page);

  await page.getByRole('button', {name: 'Open User Menu'}).click();
  await page.getByRole('menuitem', {name: 'Change Password'}).click();
  await expect(page).toHaveURL(/\/admin\/users\/.+/);

  // Submit without touching the (empty) password field.
  await page.getByRole('button', {name: 'Save'}).click();
  await expect(page).toHaveURL(/\/admin\/users$/);

  // The original password still verifies against the stored hash.
  const user = await db.prisma.user.findUnique({where: {email: ADMIN_EMAIL}});
  expect(await bcrypt.compare(ADMIN_PASSWORD, user!.password)).toBe(true);
});

test('admin can sign out via the user menu', async ({page, db: _db}) => {
  await login(page);

  await page.getByRole('button', {name: 'Open User Menu'}).click();
  await page.getByRole('menuitem', {name: 'Sign Out'}).click();

  // Redirected back to the admin login screen.
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('button', {name: 'Sign In'})).toBeVisible();
  // The authenticated user menu is gone.
  await expect(page.getByRole('button', {name: 'Open User Menu'})).toHaveCount(0);
});
