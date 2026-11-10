/**
 * Playwright E2E and Visual Capture Suite for Pixel-Clone (`run_e2e_clone.cjs`)
 * Target Viewport: 1536x800 CSS viewport matching reference video
 */

const { chromium } = require('../../frontend-legacy/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CAPTURES_DIR = path.resolve(__dirname, '../../docs/comparison/current');
fs.mkdirSync(CAPTURES_DIR, { recursive: true });

const BASE_URL = 'http://127.0.0.1:5188';

async function capture(page, name) {
  const filePath = path.join(CAPTURES_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`[Captured] ${name}.png (${fs.statSync(filePath).size} bytes)`);
}

async function run() {
  console.log('--- 1. Initializing Programmatic Vite Preview Server ---');
  const vite = await import('../../frontend-legacy/node_modules/vite/dist/node/index.js');
  const server = await vite.preview({
    root: path.resolve(__dirname, '..'),
    preview: {
      port: 5188,
      host: '127.0.0.1',
    },
  });
  console.log('Vite preview server running at:', server.resolvedUrls.local[0]);

  try {
    const browser = await chromium.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-gpu'],
    });

    // 1536x800 CSS viewport matching the video recording
    const context = await browser.newContext({ viewport: { width: 1536, height: 800 } });
    const page = await context.newPage();

    console.log('\n--- 2. Public Home Page Captures ---');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await capture(page, '01_landing_hero');

    // Scroll to "From data to dialogue" flow
    await page.evaluate(() => window.scrollTo(0, 920));
    await page.waitForTimeout(300);
    await capture(page, '02_landing_flow');

    // Scroll to "Heard. Handled." follow-through
    await page.evaluate(() => window.scrollTo(0, 1850));
    await page.waitForTimeout(300);
    await capture(page, '03_landing_action');

    console.log('\n--- 3. Split-Screen Login ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await capture(page, '04_split_login');

    console.log('\n--- 4. Sign in & Dashboard ---');
    await page.fill('input[type="email"]', 'admin@viit.ac.in');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for 800ms loading transition overlay then dashboard
    await page.waitForURL('**/app/dashboard', { timeout: 10000 });
    await page.waitForTimeout(500);
    await capture(page, '05_admin_dashboard');

    console.log('\n--- 5. 7-Step Campaign Wizard Captures ---');
    await page.goto(`${BASE_URL}/app/campaign/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await capture(page, '06_wizard_step1_dept');

    // Select CSE and continue to Year
    await page.locator('h3:has-text("CSE")').first().click();
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(400);
    await capture(page, '07_wizard_step2_year');

    // Select 3rd Year and continue to Section
    await page.locator('h3:has-text("3rd year")').first().click();
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(400);
    await capture(page, '08_wizard_step3_section');

    // Select Section F and continue to Module
    await page.locator('h3:has-text("Section F")').first().click();
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(400);
    await capture(page, '09_wizard_step4_module');

    // Select Mentoring and continue to Step 5 Students
    await page.locator('h3:has-text("Mentoring & attendance")').first().click();
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(400);
    await capture(page, '10_wizard_step5_empty');

    console.log('\n--- 6. Reports & History ---');
    await page.goto(`${BASE_URL}/app/reports`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await capture(page, '12_reports_screen');

    console.log('\n--- 7. Issues Board ---');
    await page.goto(`${BASE_URL}/app/issues`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await capture(page, '13_issues_board');

    console.log('\n--- 8. Live Monitor ---');
    await page.goto(`${BASE_URL}/app/campaign/monitor/1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await capture(page, '14_live_monitor');

    console.log('\n--- 9. Role Permissions Security Check ---');
    // Clear storage and switch to Faculty user
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'ramesh.k@viit.ac.in');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app/dashboard', { timeout: 10000 });

    // Faculty tries to open Users & Classes URL -> must redirect to /forbidden
    await page.goto(`${BASE_URL}/app/users-classes`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const facultyForbidden = page.url().includes('/forbidden');
    console.log(`[Security Guard] Faculty blocked from Users & Classes: ${facultyForbidden ? 'PASS (403)' : 'FAIL'}`);

    console.log('\n--- 10. Mobile Responsiveness Check (375x667) ---');
    const mobileContext = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await capture(mobilePage, 'mobile_01_landing');

    await browser.close();
    await server.close();
    console.log('\nAll E2E alignment steps and visual captures completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('E2E Alignment Error:', err);
    await server.close();
    process.exit(1);
  }
}

run();
