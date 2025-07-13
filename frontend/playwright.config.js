import { defineConfig } from '@playwright/test';

export default defineConfig({
    outputDir: '__tests__/e2e/test-results',
    use: {
        trace: 'off',
        screenshot: 'off',
        video: 'off'
    }
});