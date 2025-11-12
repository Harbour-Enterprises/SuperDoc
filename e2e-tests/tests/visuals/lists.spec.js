import { test, expect } from '@playwright/test';
import { sleep, goToPageAndWaitForEditor } from '../helpers.js';

test.describe('lists', () => {
  for (const listType of ['unordered', 'ordered']) {
    test.describe(listType, () => {
      test('should create a basic list', async ({ page }) => {
        const superEditor = await goToPageAndWaitForEditor(page);
        await superEditor.click();

        const listTypePrefix = listType === 'unordered' ? '-' : '1.';
        await page.keyboard.type(`${listTypePrefix} Hello`, { delay: 100 });
        await expect(superEditor).toHaveScreenshot({
          name: `${listType}-basic-list.png`,
        });
      });

      test('should create a nested list', async ({ page }) => {
        const superEditor = await goToPageAndWaitForEditor(page);
        await superEditor.click();

        const listTypePrefix = listType === 'unordered' ? '-' : '1.';
        await page.keyboard.type(`${listTypePrefix} Hello`, { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.press('Tab');
        await page.keyboard.type('World', { delay: 100 });

        await expect(superEditor).toHaveScreenshot({
          name: `${listType}-nested-list.png`,
        });
      });

      test('should create a nested list with subslists', async ({ page }) => {
        const superEditor = await goToPageAndWaitForEditor(page);
        await superEditor.click();

        const listTypePrefix = listType === 'unordered' ? '-' : '1.';
        await page.keyboard.type(`${listTypePrefix} Hello`, { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.press('Tab');
        await page.keyboard.type('World', { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.press('Tab');
        await page.keyboard.type('Hello', { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.press('Tab');
        await page.keyboard.type('World', { delay: 100 });

        await expect(superEditor).toHaveScreenshot({
          name: `${listType}-nested-list-with-sublist.png`,
        });
      });

      test('should de-indent a list with shift tab', async ({ page }) => {
        const superEditor = await goToPageAndWaitForEditor(page);
        await superEditor.click();

        const listTypePrefix = listType === 'unordered' ? '-' : '1.';
        await page.keyboard.type(`${listTypePrefix} Hello`, { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.press('Tab');
        await page.keyboard.type('World', { delay: 100 });

        await page.keyboard.press('Shift+Tab');
        await expect(superEditor).toHaveScreenshot({
          name: `${listType}-shift-tab.png`,
        });
      });

      test('should indent a list with tab', async ({ page }) => {
        const superEditor = await goToPageAndWaitForEditor(page);
        await superEditor.click();

        const listTypePrefix = listType === 'unordered' ? '-' : '1.';
        await page.keyboard.type(`${listTypePrefix} Hello`, { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('World', { delay: 100 });
        await page.keyboard.press('Tab');
        await expect(superEditor).toHaveScreenshot({
          name: `${listType}-indent-list.png`,
        });
      });

      test('should add a table to a list item', async ({ page }) => {
        const superEditor = await goToPageAndWaitForEditor(page);
        await superEditor.click();

        const listTypePrefix = listType === 'unordered' ? '-' : '1.';
        await page.keyboard.type(`${listTypePrefix} Hello`, { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.press('Tab');
        await page.keyboard.type('Table', { delay: 100 });

        // Find data-item="btn-table"
        const showTableButton = await page.locator('div[data-item="btn-table"]');
        await showTableButton.click();

        // Find the 3x3 table - data-cols=3 and data-rows=3
        const tableToAdd = await page.locator('div[data-cols="3"][data-rows="3"]');
        await tableToAdd.click();

        await page.keyboard.press('Enter');
        await page.keyboard.type('Content after table', { delay: 100 });

        await expect(superEditor).toHaveScreenshot({
          name: `${listType}-table-in-list.png`,
        });
      });

      test('should create a list and delete an item', async ({ page }) => {
        const superEditor = await goToPageAndWaitForEditor(page);
        await superEditor.click();

        const listTypePrefix = listType === 'unordered' ? '-' : '1.';
        await page.keyboard.type(`${listTypePrefix} Hello`, { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('World', { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('Delete this item', { delay: 100 });
        await page.getByText('Delete this item').click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await page.keyboard.press('Backspace');

        await expect(superEditor).toHaveScreenshot({
          name: `${listType}-list-and-delete-item.png`,
        });
      });

      test('should press enter before a list and insert an empty list item', async ({ page }) => {
        const superEditor = await goToPageAndWaitForEditor(page);
        await superEditor.click();

        const listTypePrefix = listType === 'unordered' ? '-' : '1.';
        await page.keyboard.type(`${listTypePrefix} Hello`, { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('World', { delay: 100 });
        await page.keyboard.press('ControlOrMeta+A');
        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('Enter');

        await expect(superEditor).toHaveScreenshot({
          name: `${listType}-enter-before-list.png`,
        });
      });

      test('should press enter inside a list and insert an empty list item', async ({ page }) => {
        const superEditor = await goToPageAndWaitForEditor(page);
        await superEditor.click();

        const listTypePrefix = listType === 'unordered' ? '-' : '1.';
        await page.keyboard.type(`${listTypePrefix} Hello`, { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('World', { delay: 100 });
        await page.keyboard.press('ControlOrMeta+ArrowLeft', { delay: 100 });
        await page.keyboard.press('Enter');

        await expect(superEditor).toHaveScreenshot({
          name: `${listType}-enter-inside-list.png`,
        });
      });

      test('should press enter after a list and insert an empty list item', async ({ page }) => {
        const superEditor = await goToPageAndWaitForEditor(page);
        await superEditor.click();

        const listTypePrefix = listType === 'unordered' ? '-' : '1.';
        await page.keyboard.type(`${listTypePrefix} Hello`, { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('World', { delay: 100 });
        await page.keyboard.press('Enter');

        await expect(superEditor).toHaveScreenshot({
          name: `${listType}-enter-after-list.png`,
        });
      });

      test('should change list type', async ({ page }) => {
        const superEditor = await goToPageAndWaitForEditor(page);
        await superEditor.click();

        const listTypePrefix = listType === 'unordered' ? '-' : '1.';
        await page.keyboard.type(`${listTypePrefix} Hello`, { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('World', { delay: 100 });
        await page.keyboard.press('ControlOrMeta+A'); // Select all
        if (listType === 'ordered') {
          await page.click('[data-item="btn-list"]');
        } else {
          await page.click('[data-item="btn-numberedlist"]');
        }
        await expect(superEditor).toHaveScreenshot({
          name: `${listType}-change-list-type.png`,
        });
      });

      test('should create lists inside table cells', async ({ page }) => {
        // Bug fixed in https://linear.app/harbour/issue/HAR-10437
        const superEditor = await goToPageAndWaitForEditor(page);
        await superEditor.click();

        // Create a table
        const showTableButton = await page.locator('div[data-item="btn-table"]');
        await showTableButton.click();
        const tableToAdd = await page.locator('div[data-cols="3"][data-rows="3"]');
        await tableToAdd.click();

        // Click in the first cell and create a list
        const firstCell = superEditor.locator('td').first();
        await firstCell.click();

        const listTypePrefix = listType === 'unordered' ? '-' : '1.';

        // Type the list prefix
        await page.keyboard.type(`${listTypePrefix} `);

        await page.keyboard.type('Item in table cell', { delay: 100 });

        await page.keyboard.press('Enter');
        await page.keyboard.type('Second item', { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('Another list item', { delay: 100 });

        await expect(superEditor).toHaveScreenshot({
          name: `${listType}-lists-in-table-cells.png`,
        });
      });

      test('should paste content into lists', async ({ page, context }) => {
        // Grant clipboard permissions
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        const superEditor = await goToPageAndWaitForEditor(page);
        await superEditor.click();

        // Create a basic list
        const listTypePrefix = listType === 'unordered' ? '-' : '1.';
        await page.keyboard.type(`${listTypePrefix} First item`, {
          delay: 100,
        });
        await page.keyboard.press('Enter');
        await page.keyboard.type('Second item', { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('Third item', { delay: 100 });
        await page.keyboard.press('Enter');

        // Set clipboard content and paste
        await page.evaluate(() => navigator.clipboard.writeText('Pasted content here'));
        await page.waitForTimeout(100); // Small delay to ensure clipboard is set

        // Paste using keyboard shortcut
        await page.keyboard.press('ControlOrMeta+v');

        await expect(superEditor).toHaveScreenshot({
          name: `${listType}-paste-content-into-lists.png`,
        });
      });

      test('should add inline images within lists', async ({ page }) => {
        const superEditor = await goToPageAndWaitForEditor(page);
        await superEditor.click();

        // Create a basic list
        const listTypePrefix = listType === 'unordered' ? '-' : '1.';
        await page.keyboard.type(`${listTypePrefix} Item with image below `, {
          delay: 100,
        });
        await page.keyboard.press('Enter');

        // Click the toolbar image button and handle the native file chooser
        const imageButton = page.locator('div[data-item="btn-image"]');
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser', { timeout: 5_000 }),
          imageButton.click(),
        ]);
        const imagePath = './tests/visuals/test-files/test-image.jpg';
        await fileChooser.setFiles(imagePath);

        // Give the editor a moment to process the image
        await page.waitForTimeout(1_000);

        await page.keyboard.press('Enter');
        await page.keyboard.type('Item after image', { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('Another item', { delay: 100 });

        await expect(superEditor).toHaveScreenshot({
          name: `${listType}-inline-images-within-lists.png`,
        });
      });

      test('should turn existing text into a list', async ({ page }) => {
        const superEditor = await goToPageAndWaitForEditor(page);
        await superEditor.click();

        // Add a few paragraphs of text
        await page.keyboard.type('Item 1', { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('Item 2', { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('Item 3', { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('Item 4', { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('Item 5', { delay: 100 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('Item 6', { delay: 100 });

        await superEditor.press('ControlOrMeta+A');
        const listButton =
          listType === 'unordered'
            ? await page.locator('div[data-item="btn-list"]')
            : await page.locator('div[data-item="btn-numberedlist"]');
        await listButton.click();
        await sleep(200);
        await expect(superEditor).toHaveScreenshot({
          name: `${listType}-turn-text-into-list.png`,
        });
      });

      test('should press enter twice and exit the list', async ({ page }) => {
        const superEditor = await goToPageAndWaitForEditor(page);
        await superEditor.click();

        const listTypePrefix = listType === 'unordered' ? '-' : '1.';
        await page.keyboard.type(`${listTypePrefix} Text inside list`, {
          delay: 100,
        });
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Text outside list', { delay: 100 });
        await expect(superEditor).toHaveScreenshot({
          name: `${listType}-press-enter-twice-and-exit-the-list.png`,
        });
      });

      test('should change a sublist type', async ({ page }) => {
        const superEditor = await goToPageAndWaitForEditor(page);
        await superEditor.click();

        const listTypePrefix = listType === 'unordered' ? '-' : '1.';
        await page.keyboard.type(`${listTypePrefix} Item 1`, {
          delay: 100,
        });
        await page.keyboard.press('Enter');
        await page.keyboard.press('Tab');
        await page.keyboard.type('Sublist item 1', { delay: 100 });

        if (listType === 'ordered') {
          await page.click('[data-item="btn-list"]');
        } else {
          await page.click('[data-item="btn-numberedlist"]');
        }

        await expect(superEditor).toHaveScreenshot({
          name: `${listType}-change-sublist-type.png`,
        });
      });
    });
  }
});
