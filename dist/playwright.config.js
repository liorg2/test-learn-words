import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
    testDir: './e2e-tests',
    timeout: 60000,
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1,
    workers: 1,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:5500',
        trace: 'on',
        screenshot: 'on',
        video: 'on-first-retry',
        headless: false,
        channel: 'chrome',
        navigationTimeout: 30000,
        actionTimeout: 15000,
    },
    projects: [
        {
            name: 'chromium',
            use: Object.assign(Object.assign({}, devices['Desktop Chrome']), {
                launchOptions: {
                    args: ['--start-maximized', '--disable-web-security', '--disable-features=IsolateOrigins']
                }
            }),
        },
    ],
    webServer: {
        command: 'npx http-server -p 5500',
        port: 5500,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
    },
});
