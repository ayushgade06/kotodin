import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('recalibration: a failing effluent test recalibrates the fleet and grows the visit queue', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/program');
  const queue = page.getByRole('list', { name: 'Visit queue' });
  await expect(queue.getByRole('listitem').first()).toBeVisible();
  const before = await queue.getByRole('listitem').count();
  await expect(page.getByText('2 of 3 tests needed')).toBeVisible();

  await queue.getByRole('link', { name: /HH-014/ }).click();
  await expect(page.getByRole('heading', { name: 'HH-014' })).toBeVisible();
  await page.getByLabel('Arsenic (µg/L)').fill('14');
  await page.getByRole('button', { name: 'Log breakthrough' }).click();
  await expect(page.getByText(/Calibration updated: k 1\.00 → 0\.\d\d/)).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'Breakthrough detected' })).toBeVisible();

  await page.getByRole('button', { name: 'See the queue' }).click();
  await expect(queue.getByRole('listitem').first()).toBeVisible();
  expect(await queue.getByRole('listitem').count()).toBeGreaterThanOrEqual(before + 2);
  await expect(page.getByText(/from 3 field tests/)).toBeVisible();

  // Edits persist across reload
  await page.reload();
  await expect(page.getByText(/from 3 field tests/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('card: a sticker link shows the Bangla countdown; a tampered link shows the error', async ({ page }) => {
  await page.goto('/');
  const href = await page.getByRole('link', { name: /See a family card/ }).getAttribute('href');
  await page.goto(href!);
  await expect(page.getByTestId('days-left')).toHaveText(/^[০-৯]+$/);
  await expect(page.getByText('দিন বাকি')).toBeVisible();
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByTestId('days-left')).toHaveText(/^\d+$/);
  await page.goto('/card#eyJ2IjoxLCJjb2RlIjoiSEgtMDAxIn0');
  await expect(page.getByText('এই স্টিকারটি পড়া যাচ্ছে না। আপনার মাঠকর্মীকে জিজ্ঞেস করুন।')).toBeVisible();
});

test('lab: changing pouch mass updates the replacement share; params live in the URL', async ({ page }) => {
  await page.goto('/lab');
  const pct = page.getByTestId('pct-monthly');
  await expect(pct).toBeVisible();
  const before = await pct.textContent();
  await page.getByLabel('Pouch mass value').fill('800');
  await expect(pct).not.toHaveText(before!);
  await expect(page).toHaveURL(/m=800/);
  await page.reload();
  await expect(page.getByLabel('Pouch mass value')).toHaveValue('800');
});

test('add household: a new household persists and appears in the table', async ({ page, isMobile }) => {
  test.skip(isMobile, 'map-click entry is exercised on desktop');
  await page.goto('/program');
  await page.getByRole('button', { name: 'Add household' }).click();
  await page.getByLabel('Latitude').fill('23.70');
  await page.getByLabel('Longitude').fill('90.55');
  await page.getByLabel('Arsenic in well water (µg/L)').fill('250');
  await page.getByRole('dialog').getByRole('button', { name: 'Add household' }).click();
  await expect(page.getByRole('heading', { name: 'HH-041' })).toBeVisible();
  await page.goto('/program');
  await expect(page.getByRole('link', { name: 'HH-041' })).toBeVisible();
});
