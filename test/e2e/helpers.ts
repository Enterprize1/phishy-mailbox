import {expect, Page} from '@playwright/test';
import {ADMIN_EMAIL, ADMIN_PASSWORD} from './seed';

/** Log in as the seeded admin and wait for the authenticated area to load. */
export const login = async (page: Page) => {
  await page.goto('/admin');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', {name: 'Sign In'}).click();
  await expect(page).toHaveURL(/\/admin\/emails/);
};
