import {test, expect, Page} from '@playwright/test';

async function dragDropEmail(page: Page, fromName: string, toName: string) {
  // As described in https://playwright.dev/docs/input#dragging-manually the drag and drop implementation needs to
  // receive the dragover event and thus a manual drag and drop is required.

  await page.getByRole('button', {name: fromName}).hover();

  await page.mouse.down();

  await page.getByRole('button', {name: toName}).hover();
  await page.getByRole('button', {name: toName}).hover();

  await page.mouse.up();
}

test('Smoke test of the participant interface', async ({page}) => {
  await page.goto('/');
  await page.getByLabel('Access Code').click();
  await page.getByLabel('Access Code').fill('123');
  await page.getByRole('button', {name: 'Start'}).click();
  const pageStartPromise = page.waitForEvent('popup');
  await page.getByRole('link', {name: 'Click here to start'}).click();
  const pageStart = await pageStartPromise;
  expect(pageStart.url()).toBe('https://example.com/start/123');

  await dragDropEmail(page, 'Study Introduction', 'Jetzt bearbeiten 0');
  await dragDropEmail(page, 'Human Not-Phishing', 'Jetzt bearbeiten 0');
  await dragDropEmail(page, 'Phish Phishing', 'Junk 0');

  await page.getByRole('button', {name: 'Finish'}).click();
  const pageEndPromise = page.waitForEvent('popup');
  await page.getByRole('link', {name: 'Click here to continue'}).click();
  const pageEnd = await pageEndPromise;

  expect(pageEnd.url()).toBe('https://example.com/end/123');
});
