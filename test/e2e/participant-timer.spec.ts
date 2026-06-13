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

for (const timerMode of ['HIDDEN', 'DISABLED'] as const) {
  test(`with timer mode ${timerMode} the countdown is hidden and the study can be finished manually`, async ({
    page,
    db,
  }) => {
    test.slow();
    const {code, studyId} = await seedSingleEmailStudy(db.prisma, {timerMode});

    await page.goto('/' + code);

    // Drag the introduction email into the folder to start the study.
    await dragDropEmail(page, 'Study Introduction', 'Sortierordner 0');
    // Sort the only real email so the study can be finished.
    await dragDropEmail(page, 'Single Subject', 'Sortierordner 0');

    // The remaining-time readout is only rendered in VISIBLE mode.
    await expect(page.getByText('Remaining')).toHaveCount(0);

    const finish = page.getByRole('button', {name: 'Finish'});
    await expect(finish).toBeVisible();
    await finish.click();

    await expect(page.getByText('You have completed the study.')).toBeVisible();
    await expect
      .poll(async () => (await db.prisma.participation.findFirst({where: {studyId}}))?.finishedAt ?? null, {
        timeout: 20000,
      })
      .not.toBeNull();
  });
}
