import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8080';

test.describe('Secret Notes E2E', () => {
    test('User can create a secret note and see confirmation', async ({ page }) => {
        await page.goto(`${BASE_URL}?user_id=e2e_test_user`);

        await page.getByPlaceholder('Enter your secret note...').fill('Playwright secret note');
        await page.getByPlaceholder('Enter encryption key...').fill('pw-key-123');
        await page.getByRole('button', { name: /encrypt note/i }).click();

        await expect(page.getByText(/note encrypted successfully/i)).toBeVisible();
    });

    test('User can decrypt a note with correct key', async ({ page }) => {
        await page.goto(BASE_URL);

        const uniqueContent = `Decrypt me! ${Date.now()}`;

        await page.evaluate(async (content) => {
            await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    key: 'right-key',
                    user_id: 'e2e_test_user'
                })
            });
        }, uniqueContent);

        await page.goto(`${BASE_URL}?user_id=e2e_test_user`);

        const firstNote = page.locator('.note-item').first();
        const decryptInput = firstNote.locator('input[placeholder="Enter decryption key..."]');
        const decryptButton = firstNote.locator('button', { hasText: 'Decrypt' });

        await decryptInput.fill('right-key');
        await decryptButton.click();

        await expect(firstNote.getByText(/decrypted content:/i)).toBeVisible();
        await expect(firstNote.getByText(uniqueContent)).toBeVisible();
    });

    test('User sees error with wrong decryption key', async ({ page }) => {
        await page.goto(`${BASE_URL}?user_id=e2e_test_user`);

        await page.getByPlaceholder('Enter your secret note...').fill('Wrong key test');
        await page.getByPlaceholder('Enter encryption key...').fill('correct-key');
        await page.getByRole('button', { name: /encrypt note/i }).click();
        await expect(page.getByText(/note encrypted successfully/i)).toBeVisible();

        await expect(page.locator('.note-item input[placeholder="Enter decryption key..."]').first()).toBeVisible();

        const decryptInput = page.locator('.note-item input[placeholder="Enter decryption key..."]').first();
        const decryptButton = page.locator('.note-item button', { hasText: 'Decrypt' }).first();

        await decryptInput.fill('wrong-key');
        await decryptButton.click();

        const firstNote = page.locator('.note-item').first();
        await expect(firstNote.locator('.error')).toContainText(/invalid decryption key/i);
    });

});