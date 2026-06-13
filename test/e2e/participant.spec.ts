import {test, expect} from './fixtures';
import {Page} from '@playwright/test';

// Manual drag & drop: dnd-kit needs the dragover event, so we drive the mouse
// step by step (see https://playwright.dev/docs/input#dragging-manually).
async function dragDropEmail(page: Page, fromName: string, toName: string) {
  await page.getByRole('button', {name: fromName}).hover();
  await page.mouse.down();
  await page.getByRole('button', {name: toName}).hover();
  await page.getByRole('button', {name: toName}).hover();
  await page.mouse.up();
}

test('a participant can complete a study end to end', async ({page, db}) => {
  const {code} = await db.seedParticipantStudy();

  await page.goto('/');
  await page.getByLabel('Access Code').fill(code);
  await page.getByRole('button', {name: 'Start'}).click();

  // The introduction email holds the start link (opens in a new tab).
  const startPopupPromise = page.waitForEvent('popup');
  await page.getByRole('link', {name: 'Click here to start'}).click();
  const startPopup = await startPopupPromise;
  expect(startPopup.url()).toBe(`https://example.com/start/${code}`);

  // Dragging the introduction email into any folder starts the study.
  await dragDropEmail(page, 'Study Introduction', 'Jetzt bearbeiten 0');
  // Now sort the two real emails.
  await dragDropEmail(page, 'Human Not-Phishing', 'Jetzt bearbeiten 0');
  await dragDropEmail(page, 'Phish Phishing', 'Junk 0');

  await page.getByRole('button', {name: 'Finish'}).click();

  const endPopupPromise = page.waitForEvent('popup');
  await page.getByRole('link', {name: 'Click here to continue'}).click();
  const endPopup = await endPopupPromise;
  expect(endPopup.url()).toBe(`https://example.com/end/${code}`);
});

test('an invalid access code is rejected', async ({page, db}) => {
  await db.seedParticipantStudy();

  await page.goto('/');
  await page.getByLabel('Access Code').fill('definitely-not-a-code');
  await page.getByRole('button', {name: 'Start'}).click();

  await expect(page.getByText('Invalid access code.')).toBeVisible();
});
