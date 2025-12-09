import { expect } from '@playwright/test';

export const goToPageAndWaitForEditor = async (
  page,
  { includeFontsResolved = false, includeComments = false, layout } = {
    includeFontsResolved: false,
    includeComments: false,
    layout: undefined,
  },
) => {
  const params = new URLSearchParams();
  if (includeFontsResolved) {
    params.set('includeFontsResolved', 'true');
  }
  if (includeComments) {
    params.set('includeComments', 'true');
  }
  if (layout === 0 || layout === 1) {
    params.set('layout', String(layout));
  }

  const url = params.toString() ? `http://localhost:4173/?${params.toString()}` : 'http://localhost:4173/';

  await page.goto(url);
  await page.waitForSelector('div.super-editor');
  const superEditor = page.locator('div.super-editor').first();
  await expect(superEditor).toBeVisible({
    timeout: 1_000,
  });
  return superEditor;
};

export function ptToPx(pt) {
  return `${pt * 1.3333333333333333}px`;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
