import { expect } from '@playwright/test';

export const goToPageAndWaitForEditor = async (
  page,
  { includeFontsResolved = false, includeComments = false } = { includeFontsResolved: false, includeComments: false },
) => {
  let url = 'http://localhost:4173/';
  if (includeFontsResolved) {
    url += '?includeFontsResolved=true';
  }
  if (includeComments) {
    url += '?includeComments=true';
  }

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
