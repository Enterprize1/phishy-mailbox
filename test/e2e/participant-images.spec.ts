import {test, expect} from './fixtures';
import {Page} from '@playwright/test';
import {seedSingleEmailStudy} from './seed';

// Manual drag & drop: dnd-kit needs the dragover event, so we drive the mouse
// step by step (see https://playwright.dev/docs/input#dragging-manually).
async function dragDropEmail(page: Page, fromName: string, toName: string) {
  await page.getByRole('button', {name: fromName}).hover();
  await page.mouse.down();
  await page.getByRole('button', {name: toName}).hover();
  await page.getByRole('button', {name: toName}).hover();
  await page.mouse.up();
}

const IMG_BODY = '<p>Hello</p><img src="https://example.com/tracker.png" alt="ext" />';

async function startAndOpenEmail(page: Page, code: string) {
  await page.goto('/' + code);
  await dragDropEmail(page, 'Study Introduction', 'Sortierordner 0');

  // The freshly mounted email button can briefly ignore clicks while React
  // rewires it after the start refetch — retry until the email opens.
  const emailButton = page.getByRole('button', {name: /Single Subject/});
  await expect(async () => {
    await emailButton.click();
    await expect(page.locator('iframe')).toBeVisible({timeout: 2000});
  }).toPass({timeout: 20000});
}

test('external image mode HIDE blocks images without an unblock prompt', async ({page, db}) => {
  test.slow();
  const {code} = await seedSingleEmailStudy(db.prisma, {
    externalImageMode: 'HIDE',
    allowExternalImages: true,
    body: IMG_BODY,
  });

  await startAndOpenEmail(page, code);

  // No "show images" prompt and the email frame is loaded with images blocked.
  await expect(page.getByRole('button', {name: 'Show Images'})).toHaveCount(0);
  await expect(page.locator('iframe')).not.toHaveAttribute('src', /showExternalImages=true/);
});

test('external image mode SHOW reveals images immediately', async ({page, db}) => {
  test.slow();
  const {code} = await seedSingleEmailStudy(db.prisma, {
    externalImageMode: 'SHOW',
    allowExternalImages: true,
    body: IMG_BODY,
  });

  await startAndOpenEmail(page, code);

  // Images are shown from the start, so there is no prompt and the frame opts in.
  await expect(page.getByRole('button', {name: 'Show Images'})).toHaveCount(0);
  await expect(page.locator('iframe')).toHaveAttribute('src', /showExternalImages=true/);
});
