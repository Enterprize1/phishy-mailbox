import {test, expect} from './fixtures';
import {ADMIN_EMAIL, ADMIN_PASSWORD} from './seed';

const login = async (page: import('@playwright/test').Page) => {
  await page.goto('/admin');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', {name: 'Sign In'}).click();
  await expect(page).toHaveURL(/\/admin\/emails/);
};

test('admin can log in and reach the authenticated areas', async ({page, db}) => {
  // db fixture guarantees a clean DB + freshly seeded admin user.
  void db;
  await login(page);

  // Authenticated layout with its sidebar navigation is rendered.
  await expect(page.getByRole('link', {name: 'Emails'})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Studies'})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Users'})).toBeVisible();

  await page.getByRole('link', {name: 'Studies'}).click();
  await expect(page).toHaveURL(/\/admin\/studies/);
});

test('invalid admin credentials are rejected', async ({page, db}) => {
  void db;
  await page.goto('/admin');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', {name: 'Sign In'}).click();

  await expect(page.getByText('Invalid credentials.')).toBeVisible();
});
