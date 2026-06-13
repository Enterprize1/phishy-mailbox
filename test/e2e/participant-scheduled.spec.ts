import {test, expect} from './fixtures';
import {Page} from '@playwright/test';
import {seedScheduledStudy} from './seed';

// Manual drag & drop: dnd-kit needs the dragover event, so we drive the mouse
// step by step (see https://playwright.dev/docs/input#dragging-manually).
async function dragDropEmail(page: Page, fromName: string, toName: string) {
  await page.getByRole('button', {name: fromName}).hover();
  await page.mouse.down();
  await page.getByRole('button', {name: toName}).hover();
  await page.getByRole('button', {name: toName}).hover();
  await page.mouse.up();
}

test('a scheduled email only appears after its delay has elapsed', async ({page, db}) => {
  // The delayed email is gated on a wall-clock timer relative to startedAt and
  // the instrumented build is slow, so give the run plenty of headroom.
  test.slow();
  const delaySeconds = 5;
  const {code} = await seedScheduledStudy(db.prisma, delaySeconds);

  await page.goto('/' + code);

  // Dragging the introduction email into the folder starts the study; the two
  // real emails then land in the inbox.
  await dragDropEmail(page, 'Study Introduction', 'Sortierordner 0');

  const immediate = page.getByRole('button', {name: /Immediate Subject/});
  const delayed = page.getByRole('button', {name: /Delayed Subject/});

  // The immediate email is available right away, the delayed one is still hidden,
  // and the inbox folder count reflects only the visible email.
  await expect(immediate).toBeVisible();
  await expect(delayed).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Inbox 1'})).toBeVisible();

  // The folder count bumps on its own once the scheduled delay passes.
  await expect(page.getByRole('button', {name: 'Inbox 2'})).toBeVisible({
    timeout: (delaySeconds + 12) * 1000,
  });

  // Re-opening the inbox now reveals the delayed email in the list as well.
  await page.getByRole('button', {name: 'Inbox 2'}).click();
  await expect(delayed).toBeVisible();
});
