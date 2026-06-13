import {test, expect} from './fixtures';
import {Page} from '@playwright/test';
import {seedTrackingStudy, seedConsentStudy} from './seed';

// Manual drag & drop: dnd-kit needs the dragover event, so we drive the mouse
// step by step (see https://playwright.dev/docs/input#dragging-manually).
async function dragDropEmail(page: Page, fromName: string, toName: string) {
  await page.getByRole('button', {name: fromName}).hover();
  await page.mouse.down();
  await page.getByRole('button', {name: toName}).hover();
  await page.getByRole('button', {name: toName}).hover();
  await page.mouse.up();
}

test('participant email interactions are tracked', async ({page, db}) => {
  // Events are fire-and-forget mutations; under the instrumented coverage build
  // the server is slow, so give the polls generous headroom.
  test.slow();
  const pollTimeout = {timeout: 20000};
  const {code, folderName} = await seedTrackingStudy(db.prisma);

  // The list of event types recorded so far for this (single) participation.
  const eventTypes = async () =>
    (await db.prisma.participationEmailEvent.findMany()).map((e) => (e.data as {type: string}).type);

  await page.goto('/' + code);

  // Dragging the introduction email into a folder starts the study.
  await dragDropEmail(page, 'Study Introduction', `${folderName} 0`);

  // Opening the email records an email-view event and renders it. The list is
  // re-rendered by the start refetch, so the freshly mounted button can briefly
  // ignore clicks until React rewires it — retry the click until it takes.
  const emailButton = page.getByRole('button', {name: /Tracked Subject/});
  await expect(async () => {
    await emailButton.click();
    await expect(page.locator('iframe')).toBeVisible({timeout: 2000});
  }).toPass(pollTimeout);
  await expect.poll(eventTypes, pollTimeout).toContain('email-view');

  // Inspecting headers records an email-details-view event.
  await page.getByRole('button', {name: 'Show Details'}).click();
  await expect.poll(eventTypes, pollTimeout).toContain('email-details-view');
  await page.getByRole('button', {name: 'Close'}).click();

  // Revealing blocked external images records an email-external-images-view event.
  await page.getByRole('button', {name: 'Show Images'}).click();
  await expect.poll(eventTypes, pollTimeout).toContain('email-external-images-view');

  // Clicking a link inside the sandboxed email opens a new tab and is tracked.
  const popupPromise = page.waitForEvent('popup');
  await page.frameLocator('iframe').getByRole('link', {name: 'Visit'}).click();
  await popupPromise;
  await expect.poll(eventTypes, pollTimeout).toContain('email-link-click');

  // Hovering a link for >500ms records an email-link-hover event.
  await page.frameLocator('iframe').getByRole('link', {name: 'Visit'}).hover();
  await expect.poll(eventTypes, pollTimeout).toContain('email-link-hover');

  // Scrolling the email body records a (debounced) email-scrolled event.
  const frame = page.frames().find((f) => f.url().includes('/email/'));
  await frame?.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(eventTypes, pollTimeout).toContain('email-scrolled');
});

test('participant must give consent before starting', async ({page, db}) => {
  const {code} = await seedConsentStudy(db.prisma);

  await page.goto('/' + code);

  // The consent overlay blocks the study until the participant agrees.
  await expect(page.getByText('Bitte stimmen Sie der Teilnahme zu.')).toBeVisible();
  await page.getByRole('radio', {name: 'Yes, I agree'}).check();
  await page.getByRole('button', {name: 'Click here to continue'}).click();

  await expect
    .poll(async () => (await db.prisma.participation.findFirst())?.consentGivenAt ?? null, {timeout: 20000})
    .not.toBeNull();
  // Overlay is gone and the introduction email is now reachable.
  await expect(page.getByRole('button', {name: 'Study Introduction'})).toBeVisible();
});
