import { test, expect } from '@playwright/test';
import { ptToPx, sleep } from '../helpers.js';

test.describe('toolbar', () => {
  test.describe('custom buttons', () => {
    test('should work with custom buttons', async ({ page }) => {
      await page.goto('http://localhost:4173/?includeCustomButton=true');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      // Find toolbar button and click it.
      // It should add a "data-custom-id" attribute to the "Hello" node.
      const lastButton = await page.locator('div[role="button"]').last();

      await lastButton.click();
      await page.keyboard.type('Hello');

      const hello = await superEditor.getByText('Hello');
      const customAttribute = await hello.getAttribute('data-custom-id');
      expect(customAttribute).not.toBeNull();
    });
  });

  test.describe('apply toolbar item and type', () => {
    test('should add text with selected font', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      // Find button with data-item="btn-font"
      const fontButton = await page.locator('div[data-item="btn-fontFamily"]');
      await fontButton.click();

      // Select the font "Arial"
      await page.locator('div[aria-label="Font family - Georgia"]').click();

      // Click on the editor
      await superEditor.click();

      // Type "Hello"
      await page.keyboard.type('Hello');

      // Ensure the text is Arial
      const hello = await superEditor.getByText('Hello');
      expect(hello).toBeVisible();
      expect(await hello.evaluate((el) => window.getComputedStyle(el).fontFamily)).toBe('Georgia');
    });

    test('should add text with selected font size', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      // Find button with data-item="btn-fontSize"
      const fontSizeButton = await page.locator('div[data-item="btn-fontSize"]');
      await fontSizeButton.click();

      // Select the font size "16px"
      await page.locator('div[aria-label="Font size - 18"]').click();

      // Click on the editor
      await superEditor.click();

      // Type "Hello"
      await page.keyboard.type('Hello');

      // Ensure the text is 16px
      const hello = await superEditor.getByText('Hello');
      expect(hello).toBeVisible();
      expect(await hello.evaluate((el) => window.getComputedStyle(el).fontSize)).toBe(ptToPx(18));
    });

    test('should add text with bold mark', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      // Find button with data-item="btn-bold"
      const boldButton = await page.locator('div[data-item="btn-bold"]');
      await boldButton.click();

      // Click on the editor
      await superEditor.click();

      // Type "Hello"
      await page.keyboard.type('Hello');

      // Ensure the text is bold
      const hello = await superEditor.getByText('Hello');
      expect(await hello.evaluate((el) => window.getComputedStyle(el).fontWeight)).toBe('700');
    });

    test('should add text with italic mark', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      // Find button with data-item="btn-italic"
      const italicButton = await page.locator('div[data-item="btn-italic"]');
      await italicButton.click();

      // Click on the editor
      await superEditor.click();

      // Type "Hello"
      await page.keyboard.type('Hello');

      // Ensure the text is italic
      const hello = await superEditor.getByText('Hello');
      expect(await hello.evaluate((el) => window.getComputedStyle(el).fontStyle)).toBe('italic');
    });

    test('should add text with underline mark', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      // Find button with data-item="btn-underline"
      const underlineButton = await page.locator('div[data-item="btn-underline"]');
      await underlineButton.click();

      // Click on the editor
      await superEditor.click();

      // Type "Hello"
      await page.keyboard.type('Hello');

      // Ensure the text is underlined
      const hello = await superEditor.getByText('Hello');
      expect(await hello.evaluate((el) => window.getComputedStyle(el).textDecorationLine)).toBe('underline');
      expect(await hello.evaluate((el) => window.getComputedStyle(el).textDecorationStyle)).toBe('solid');
    });

    test('should add text with strikethrough mark', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      // Find button with data-item="btn-strike"
      const strikethroughButton = await page.locator('div[data-item="btn-strike"]');
      await strikethroughButton.click();

      // Click on the editor
      await superEditor.click();

      // Type "Hello"
      await page.keyboard.type('Hello');

      // Ensure the text is underlined
      const hello = await superEditor.getByText('Hello');
      expect(await hello.evaluate((el) => window.getComputedStyle(el).textDecorationLine)).toBe('line-through');
      expect(await hello.evaluate((el) => window.getComputedStyle(el).textDecorationStyle)).toBe('solid');
    });

    test('should add text with selected color', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      // Find button with data-item="btn-color"
      const colorButton = await page.locator('div[data-item="btn-color"]');
      await colorButton.click();

      // Select the color "red"
      await page.locator('div[aria-label="red"]').click();
      // Click on the editor
      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Ensure the text is red
      const hello = await superEditor.getByText('Hello');
      expect(hello).toBeVisible();
      expect(await hello.evaluate((el) => window.getComputedStyle(el).color)).toBe('rgb(210, 0, 63)');
    });

    test('should add text with selected highlight color', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      // Find button with data-item="btn-highlight"
      const highlightButton = await page.locator('div[data-item="btn-highlight"]');
      await highlightButton.click();

      // Select the color "yellow"
      await page.locator('div[aria-label="red"]').click();

      // Click on the editor
      await superEditor.click();

      // Type "Hello"
      await page.keyboard.type('Hello');

      // Ensure the text is highlighted
      const hello = await superEditor.getByText('Hello');
      expect(hello).toBeVisible();
      expect(await hello.evaluate((el) => window.getComputedStyle(el).backgroundColor)).toBe('rgb(210, 0, 63)');
    });
  });

  test.describe('select text and apply toolbar item', () => {
    test('should add bold mark to selected text', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Apply the bold mark
      const boldButton = await page.locator('div[data-item="btn-bold"]');
      await boldButton.click();

      // Ensure the text is bold
      expect(await superEditor.getByText('Hello').evaluate((el) => window.getComputedStyle(el).fontWeight)).toBe('700');
    });

    test('should add italic mark to selected text', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Apply the italic mark
      const italicButton = await page.locator('div[data-item="btn-italic"]');
      await italicButton.click();

      // Ensure the text is italic
      expect(await superEditor.getByText('Hello').evaluate((el) => window.getComputedStyle(el).fontStyle)).toBe(
        'italic',
      );
    });

    test('should add underline mark to selected text', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      const helloText = await superEditor.getByText('Hello');
      await helloText.click({
        clickCount: 2,
      });

      // Apply the underline mark
      const underlineButton = await page.locator('div[data-item="btn-underline"]');
      await underlineButton.click();

      // Ensure the text is underlined
      const hello = await superEditor.locator('u').first();
      expect(hello).toBeVisible();
      expect(await hello.innerText()).toEqual('Hello');
      expect(await hello.evaluate((el) => window.getComputedStyle(el).textDecorationLine)).toBe('underline');
      expect(await hello.evaluate((el) => window.getComputedStyle(el).textDecorationStyle)).toBe('solid');
    });

    test('should add strikethrough mark to selected text', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      const helloText = await superEditor.getByText('Hello');
      await helloText.click({
        clickCount: 2,
      });

      // Apply the strikethrough mark
      const strikethroughButton = await page.locator('div[data-item="btn-strike"]');
      await strikethroughButton.click();

      // Ensure the text is strikethrough
      const hello = await superEditor.locator('s').first();
      expect(hello).toBeVisible();
      expect(await hello.innerText()).toEqual('Hello');
      expect(await hello.evaluate((el) => window.getComputedStyle(el).textDecorationLine)).toBe('line-through');
      expect(await hello.evaluate((el) => window.getComputedStyle(el).textDecorationStyle)).toBe('solid');
    });

    test('should add color to selected text', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Apply the color mark
      const colorButton = await page.locator('div[data-item="btn-color"]');
      await colorButton.click();

      // Select the color "red"
      await page.locator('div[aria-label="red"]').click();

      // Ensure the text is red
      const hello = await superEditor.getByText('Hello');
      expect(hello).toBeVisible();
      expect(await hello.evaluate((el) => window.getComputedStyle(el).color)).toBe('rgb(210, 0, 63)');
    });

    test('should add highlight color to selected text', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Apply the color mark
      const highlightButton = await page.locator('div[data-item="btn-highlight"]');
      await highlightButton.click();

      // Select the color "red"
      await page.locator('div[aria-label="red"]').click();

      // Click back on the editor
      await superEditor.click();

      // Ensure the text is highlighted
      const hello = await superEditor.getByText('Hello');
      expect(hello).toBeVisible();

      expect(await hello.evaluate((el) => window.getComputedStyle(el).backgroundColor)).toBe('rgb(210, 0, 63)');
    });

    test('should add font size to selected text', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Apply the font size mark
      const fontSizeButton = await page.locator('div[data-item="btn-fontSize"]');
      await fontSizeButton.click();

      // Select the font size "16px"
      await page.locator('div[aria-label="Font size - 18"]').click();

      // Ensure the text is 18px
      const hello = await superEditor.getByText('Hello');
      expect(hello).toBeVisible();
      expect(await hello.evaluate((el) => window.getComputedStyle(el).fontSize)).toBe(ptToPx(18));
    });

    test('should add .5 font size to selected text', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Apply the font size mark
      const fontSizeInput = await page.locator('div[data-item="btn-fontSize"] input');
      await fontSizeInput.click();
      await fontSizeInput.fill('18.5');
      await fontSizeInput.press('Enter');

      // Ensure the text is 18px
      const hello = await superEditor.getByText('Hello');
      expect(hello).toBeVisible();
      expect(await hello.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize))).toBeCloseTo(
        parseFloat(ptToPx(18.5)),
        1,
      );
    });

    test('should add font family to selected text', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Apply the font family mark
      const fontFamilyButton = await page.locator('div[data-item="btn-fontFamily"]');
      await fontFamilyButton.click();

      // Select the font family "Arial"
      await page.locator('div[aria-label="Font family - Arial"]').click();

      // Ensure the text is Arial
      const hello = await superEditor.getByText('Hello');
      expect(hello).toBeVisible();
      expect(await hello.evaluate((el) => window.getComputedStyle(el).fontFamily)).toBe('Arial');
    });
  });

  test.describe('shortcuts', () => {
    test('should add bold mark to selected text with mod + b', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Apply the bold mark
      await page.keyboard.press('ControlOrMeta+B');

      // Ensure the text is bold
      expect(await superEditor.getByText('Hello').evaluate((el) => window.getComputedStyle(el).fontWeight)).toBe('700');
    });

    test('should add italic mark to selected text with mod + i', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Apply the italic mark
      await page.keyboard.press('ControlOrMeta+I');

      // Ensure the text is italic
      expect(await superEditor.getByText('Hello').evaluate((el) => window.getComputedStyle(el).fontStyle)).toBe(
        'italic',
      );
    });

    test('should add underline mark to selected text with mod + u', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();

      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Apply the underline mark
      await page.keyboard.press('ControlOrMeta+U');

      // Ensure the text is underlined
      const hello = await superEditor.getByText('Hello');
      expect(await hello.getByText('Hello').evaluate((el) => window.getComputedStyle(el).textDecorationLine)).toBe(
        'underline',
      );
      expect(await hello.getByText('Hello').evaluate((el) => window.getComputedStyle(el).textDecorationStyle)).toBe(
        'solid',
      );
    });

    test('should add strikethrough mark to selected text with mod + s', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();

      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Apply the strikethrough mark
      await page.keyboard.press('ControlOrMeta+Shift+S');

      // Ensure the text is strikethrough (computed style)
      const hello = await superEditor.getByText('Hello');
      expect(await hello.getByText('Hello').evaluate((el) => window.getComputedStyle(el).textDecorationLine)).toBe(
        'line-through',
      );
      expect(await hello.getByText('Hello').evaluate((el) => window.getComputedStyle(el).textDecorationStyle)).toBe(
        'solid',
      );
    });
  });

  test.describe('toolbar state', () => {
    test('should show correct font family when font family is applied', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Apply the font family mark
      const fontFamilyButton = await page.locator('div[data-item="btn-fontFamily"]');
      await fontFamilyButton.click();

      // Select the font family "Courier New"
      await page.locator('div[aria-label="Font family - Courier New"]').click();

      // Wait for the toolbar to update
      await sleep(500);

      // Click back on the text
      await superEditor.getByText('Hello').click();

      // Wait for the toolbar to update
      await sleep(500);
      const fontFamilyButtonText = await fontFamilyButton.getByText('Courier New');
      await expect(fontFamilyButtonText).toBeVisible();
    });

    test('should show correct font size when font size is applied', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Apply the font size mark
      const fontSizeButton = await page.locator('div[data-item="btn-fontSize"]');
      await fontSizeButton.click();

      // Select the font size "18"
      await page.locator('div[aria-label="Font size - 18"]').click();

      // Wait for the toolbar to update
      await sleep(500);

      // Click back on the text
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Ensure toolbar shows 18
      const fontSizeButtonText = await fontSizeButton.locator('input').inputValue();
      expect(fontSizeButtonText).toBe('18');
    });

    test('should be highlighted when bold mark is applied', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Apply the bold mark
      const boldButton = await page.locator('div[data-item="btn-bold"]');
      await boldButton.click();

      // Click back on the bold text
      await superEditor.getByText('Hello').click();

      // Wait for the toolbar to update
      await sleep(500);

      // Evaluate bold button background color
      const boldButtonBackgroundColor = await boldButton.evaluate((el) => window.getComputedStyle(el).backgroundColor);

      // Expect the bold button to be highlighted (#c8d0d8)
      expect(boldButtonBackgroundColor).toBe('rgb(200, 208, 216)');
    });

    test('should be highlighted when italic mark is applied', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Apply the italic mark
      const italicButton = await page.locator('div[data-item="btn-italic"]');
      await italicButton.click();

      // Click back on the italic text
      await superEditor.getByText('Hello').click();

      // Wait for the toolbar to update
      await sleep(500);

      // Expect the italic button to be highlighted (#c8d0d8)
      const italicButtonBackgroundColor = await italicButton.evaluate(
        (el) => window.getComputedStyle(el).backgroundColor,
      );

      expect(italicButtonBackgroundColor).toBe('rgb(200, 208, 216)');
    });

    test('should be highlighted when underline mark is applied', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Apply the underline mark
      const underlineButton = await page.locator('div[data-item="btn-underline"]');
      await underlineButton.click();

      // Click back on the underline text
      await superEditor.getByText('Hello').click();

      // Wait for the toolbar to update
      await sleep(500);

      // Expect the underline button to be highlighted (#c8d0d8)
      const underlineButtonBackgroundColor = await underlineButton.evaluate(
        (el) => window.getComputedStyle(el).backgroundColor,
      );

      expect(underlineButtonBackgroundColor).toBe('rgb(200, 208, 216)');
    });

    test('should be highlighted when strikethrough mark is applied', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Apply the strikethrough mark
      const strikethroughButton = await page.locator('div[data-item="btn-strike"]');
      await strikethroughButton.click();

      // Click back on the strikethrough text
      await superEditor.getByText('Hello').click();

      // Wait for the toolbar to update
      await sleep(500);

      // Expect the strikethrough button to be highlighted (#c8d0d8)
      const strikethroughButtonBackgroundColor = await strikethroughButton.evaluate(
        (el) => window.getComputedStyle(el).backgroundColor,
      );

      expect(strikethroughButtonBackgroundColor).toBe('rgb(200, 208, 216)');
    });

    test('should show the correct color when color is applied', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Apply the color mark
      const colorButton = await page.locator('div[data-item="btn-color"]');
      await colorButton.click();

      // Select the color "red"
      await page.locator('div[aria-label="red"]').click();

      // Ensure the color bar is red
      const colorBar = await colorButton.locator('div.color-bar');
      expect(await colorBar.evaluate((el) => window.getComputedStyle(el).backgroundColor)).toBe('rgb(210, 0, 63)');
    });

    test('should show the correct color when highlight is applied', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Apply the highlight mark
      const highlightButton = await page.locator('div[data-item="btn-highlight"]');
      await highlightButton.click();

      // Select the color "red"
      await page.locator('div[aria-label="red"]').click();

      // Ensure the highlight bar is red
      const highlightBar = await highlightButton.locator('div.color-bar');
      expect(await highlightBar.evaluate((el) => window.getComputedStyle(el).backgroundColor)).toBe('rgb(210, 0, 63)');
    });
  });

  test.describe('linked styles button', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('should add text with linked style', async ({ page }) => {
      const heading2Styles = {
        fontFamily: '"Aptos Display", sans-serif',
        fontSize: '21.3333px', // equal to 16pt in computed styles
        color: 'rgb(15, 71, 97)',
      };

      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      // Find button with data-item="btn-linkedStyles"
      const styleButton = await page.locator('div[data-item="btn-linkedStyles"]');
      await styleButton.click();

      // Select "heading 2"
      await page.locator('div[aria-label="Linked style - Heading2"]').click();

      // Click on the editor
      await superEditor.click();

      // Type "Hello"
      await page.keyboard.type('Hello');
      await page.keyboard.press('Enter');

      // Ensure the text is Arial
      const hello = await superEditor.getByText('Hello');
      expect(hello).toBeVisible();

      const parentP = hello.locator('..');
      const styleAttribute = await parentP.getAttribute('styleid');
      expect(styleAttribute).toBe('Heading2');

      const styles = await hello.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          fontSize: computed.fontSize,
          fontFamily: computed.fontFamily,
        };
      });

      expect(styles.color).toBe(heading2Styles.color);
      expect(styles.fontFamily).toBe(heading2Styles.fontFamily);
      expect(styles.fontSize).toBe(heading2Styles.fontSize);
    });

    test('should show correct label when linked style is applied', async ({ page }) => {
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');

      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      // Type "Hello"
      await page.keyboard.type('Hello');

      // Double click on the text "Hello" to select it
      await superEditor.getByText('Hello').click({
        clickCount: 2,
      });

      // Apply linked style
      const styleButton = await page.locator('div[data-item="btn-linkedStyles"]');
      await styleButton.click();

      // Select "Heading2" style
      await page.locator('div[aria-label="Linked style - Heading2"]').click();

      // Wait for the toolbar to update
      await sleep(500);

      // Click back on the text
      await superEditor.getByText('Hello').click();

      // Wait for the toolbar to update
      await sleep(500);
      const styleButtonText = await styleButton.getByText('heading 2');
      await expect(styleButtonText).toBeVisible();
    });
  });
});
