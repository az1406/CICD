import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8080';

test.describe('Secret Notes E2E', () => {
    test('User can create a secret note and see confirmation', async ({ page }) => {
        await page.goto(BASE_URL);

        await page.getByPlaceholder('Enter your secret note...').fill('Playwright secret note');
        await page.getByPlaceholder('Enter encryption key...').fill('pw-key-123');
        await page.getByRole('button', { name: /encrypt note/i }).click();

        await expect(page.getByText(/note encrypted successfully/i)).toBeVisible();
    });

    test('User can decrypt a note with correct key', async ({ page }) => {
        await page.goto(BASE_URL);

        await page.getByPlaceholder('Enter your secret note...').fill('Decrypt me!');
        await page.getByPlaceholder('Enter encryption key...').fill('right-key');
        await page.getByRole('button', { name: /encrypt note/i }).click();
        await expect(page.getByText(/note encrypted successfully/i)).toBeVisible();

        await expect(page.locator('.note-item input[placeholder="Enter decryption key..."]').first()).toBeVisible();

        const decryptInput = page.locator('.note-item input[placeholder="Enter decryption key..."]').first();
        const decryptButton = page.locator('.note-item button', { hasText: 'Decrypt' }).first();

        await decryptInput.fill('right-key');
        await decryptButton.click();

        await expect(page.getByText(/decrypted content:/i)).toBeVisible();
        await expect(page.getByText('Decrypt me!')).toBeVisible();
    });

    test('User sees error with wrong decryption key', async ({ page }) => {
        await page.goto(BASE_URL);

        await page.getByPlaceholder('Enter your secret note...').fill('Wrong key test');
        await page.getByPlaceholder('Enter encryption key...').fill('correct-key');
        await page.getByRole('button', { name: /encrypt note/i }).click();
        await expect(page.getByText(/note encrypted successfully/i)).toBeVisible();

        await expect(page.locator('.note-item input[placeholder="Enter decryption key..."]').first()).toBeVisible();

        const decryptInput = page.locator('.note-item input[placeholder="Enter decryption key..."]').first();
        const decryptButton = page.locator('.note-item button', { hasText: 'Decrypt' }).first();

        await decryptInput.fill('wrong-key');
        await decryptButton.click();

        await expect(page.getByText(/invalid decryption key/i)).toBeVisible();
    });

});