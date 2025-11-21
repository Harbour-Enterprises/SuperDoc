import { test, expect } from '@playwright/test';
import { goToPageAndWaitForEditor, sleep } from '../helpers.js';
import { fileURLToPath } from 'url';
import path from 'path';

test.describe('comments & tracked changes', () => {
  const __filename = fileURLToPath(import.meta.url);
  const testDataFolder = __filename.split('/tests/')[0] + '/test-data';

  const comments = [
    {
      author: 'Gabriel Chittolina (imported)',
      text: 'Hey there',
      date: new Date(1763038216000),
    },
    {
      author: 'Gabriel Chittolina (imported)',
      text: 'Hi again',
      date: new Date(1763038222000),
    },
  ];

  const documentTrackedChanges = [
    {
      author: 'SuperDoc 8083 (imported)',
      text: ['Added: ', 'such as this one'],
      date: new Date(1763743800000),
    },
    {
      author: 'SuperDoc 8083 (imported)',
      text: ['Deleted: ', 'removed'],
      date: new Date(1763743800000),
    },
    {
      author: 'SuperDoc 8083 (imported)',
      text: ['Added: ', 'switched', 'Deleted: ', 'replaced'],
      date: new Date(1763743800000),
    },
    {
      author: 'SuperDoc 8083 (imported)',
      text: ['Deleted: ', 'rem'],
      date: new Date(1763743800000),
    },
    {
      author: 'SuperDoc 8083 (imported)',
      text: ['Added: ', 'add'],
      date: new Date(1763743800000),
    },
  ];

  // Format date as "9:50AM Nov 13" for comments
  const formatDate = (date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();

    return `${hours}:${minutes}${ampm} ${month} ${day}`;
  };

  test('should import comments', async ({ page }) => {
    await goToPageAndWaitForEditor(page, { includeComments: true });
    await page
      .locator('input[type="file"]')
      .setInputFiles(path.join(testDataFolder, 'comments-documents/basic-comments.docx'));

    await page.waitForFunction(() => window.superdoc !== undefined && window.editor !== undefined, null, {
      polling: 100,
      timeout: 10_000,
    });

    // Wait for comments to be loaded
    await sleep(1000);

    // Find all comments by "Gabriel Chittolina (imported)"
    const commentsElements = page
      .getByRole('dialog')
      .filter({ hasText: 'Gabriel Chittolina (imported)', visible: true });
    const commentCount = await commentsElements.count();
    expect(commentCount).toBe(2);

    const firstComment = await commentsElements.nth(0);
    const firstCommentAuthor = await firstComment.getByText(comments[0].author);
    const firstCommentText = await firstComment.getByText(comments[0].text);
    const firstCommentDate = await firstComment.getByText(formatDate(comments[0].date));
    expect(firstCommentAuthor).toBeVisible();
    expect(firstCommentText).toBeVisible();
    expect(firstCommentDate).toBeVisible();

    const secondComment = await commentsElements.nth(1);
    const secondCommentAuthor = await secondComment.getByText(comments[1].author);
    const secondCommentText = await secondComment.getByText(comments[1].text);
    const secondCommentDate = await secondComment.getByText(formatDate(comments[1].date));
    expect(secondCommentAuthor).toBeVisible();
    expect(secondCommentText).toBeVisible();
    expect(secondCommentDate).toBeVisible();
  });

  test('should import all tracked changes', async ({ page }) => {
    await goToPageAndWaitForEditor(page, { includeComments: true });
    await page
      .locator('input[type="file"]')
      .setInputFiles(path.join(testDataFolder, 'comments-documents/tracked-changes.docx'));

    await page.waitForFunction(() => window.superdoc !== undefined && window.editor !== undefined, null, {
      polling: 100,
      timeout: 10_000,
    });

    await sleep(1000);

    const trackedChanges = page.getByRole('dialog').filter({ hasText: 'SuperDoc 8083 (imported)', visible: true });
    const trackedChangeCount = await trackedChanges.count();
    expect(trackedChangeCount).toBe(5);
  });

  test('should have correct tracked change text', async ({ page }) => {
    await goToPageAndWaitForEditor(page, { includeComments: true });
    await page
      .locator('input[type="file"]')
      .setInputFiles(path.join(testDataFolder, 'comments-documents/tracked-changes.docx'));

    await page.waitForFunction(() => window.superdoc !== undefined && window.editor !== undefined, null, {
      polling: 100,
      timeout: 10_000,
    });

    await sleep(1000);

    const trackedChanges = page.getByRole('dialog').filter({ hasText: 'SuperDoc 8083 (imported)', visible: true });
    const trackedChangeCount = await trackedChanges.count();

    for (let i = 0; i < trackedChangeCount; i++) {
      const trackedChange = await trackedChanges.nth(i);
      for (let j = 0; j < documentTrackedChanges[i].text.length; j++) {
        console.log(documentTrackedChanges[i].text[j]);
        const trackedChangeText = await trackedChange.getByText(documentTrackedChanges[i].text[j], { exact: true });
        expect(trackedChangeText).toBeVisible();
      }
      const trackedChangeDate = await trackedChange.getByText(formatDate(documentTrackedChanges[i].date));
      expect(trackedChangeDate).toBeVisible();
    }
  });
});
