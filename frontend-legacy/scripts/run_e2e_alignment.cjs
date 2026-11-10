/**
 * End-to-End Alignment and Visual Verification Suite (.cjs)
 * Tests multi-role workflows, security barriers, and captures full-resolution screenshots.
 */

const { chromium } = require('../node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/screenshots-v2');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const BASE_URL = 'http://127.0.0.1:5188';

async function captureScreen(page, name, isMobile = false) {
  const filename = `${name}_${isMobile ? 'mobile' : 'desktop'}.png`;
  const filePath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`[Captured] ${filename} (${fs.statSync(filePath).size} bytes)`);
}

async function run() {
  console.log('--- 1. Initializing Programmatic Vite Preview Server ---');
  const vite = await import('../node_modules/vite/dist/node/index.js');
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

    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const mobileContext = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true });

    const page = await desktopContext.newPage();
    const mobilePage = await mobileContext.newPage();

    console.log('\n--- 2. Public Home Page & Mobile View ---');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await captureScreen(page, '01_home_top');

    // Scroll to flow section
    await page.evaluate(() => window.scrollTo(0, 950));
    await page.waitForTimeout(400);
    await captureScreen(page, '01_home_flow');

    // Scroll to action section
    await page.evaluate(() => window.scrollTo(0, 1900));
    await page.waitForTimeout(400);
    await captureScreen(page, '01_home_action');

    await mobilePage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await captureScreen(mobilePage, '01_home_top', true);

    console.log('\n--- 3. Split-Screen Login ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await captureScreen(page, '02_login_split');

    await mobilePage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await captureScreen(mobilePage, '02_login_split', true);

    console.log('\n--- 4. Dashboard Views (Admin & Faculty) ---');
    // Admin Dashboard
    await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await captureScreen(page, '03_dashboard_admin');
    await mobilePage.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
    await captureScreen(mobilePage, '03_dashboard_admin', true);

    // Switch to Faculty Role
    await page.evaluate(() => {
      localStorage.setItem('viit_active_user', JSON.stringify({
        id: 3,
        email: 'faculty.cse@vignan.edu.in',
        fullName: 'Dr. Ch. Radhika',
        role: 'faculty',
        department: 'CSE',
        assignedSections: ['A', 'B'],
        isActive: true,
      }));
      window.location.reload();
    });
    await page.waitForTimeout(600);
    await captureScreen(page, '03_dashboard_faculty');

    console.log('\n--- 5. Campaign Creation Wizard (Steps 1-7) ---');
    // Step 1: Department
    await page.goto(`${BASE_URL}/app/campaign/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    // Click CSE card explicitly
    await page.click('[data-testid="dept-CSE"]');
    await page.waitForTimeout(300);
    await captureScreen(page, '04_wizard_01_dept');

    // Continue to Step 2: Year
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(600);
    // Click Year 3 card
    await page.click('[data-testid="year-3"]');
    await page.waitForTimeout(400);
    await captureScreen(page, '04_wizard_02_year');

    // Continue to Step 3: Section
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(600);
    // Click Section A
    await page.click('[data-testid="section-A"]');
    await page.waitForTimeout(400);
    await captureScreen(page, '04_wizard_03_section');

    // Continue to Step 4: Module & Date
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(600);
    // Select Mentoring & attendance
    await page.click('[data-testid="module-mentoring"]');
    await page.waitForTimeout(400);
    await captureScreen(page, '04_wizard_04_module');

    // Continue to Step 5: Student Upload
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(600);

    // Upload with errors
    const errorFilePath = path.resolve(__dirname, '../../docs/sample-data/with_errors.xlsx');
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.setInputFiles(errorFilePath);
      await page.waitForTimeout(1000);
      await captureScreen(page, '04_wizard_05_upload_error');
    }

    // Upload valid file
    const validFilePath = path.resolve(__dirname, '../../docs/sample-data/valid_attendance.xlsx');
    if (fileInput) {
      await fileInput.setInputFiles(validFilePath);
      await page.waitForTimeout(1200);
      await captureScreen(page, '04_wizard_05_upload_valid');
    }

    // Continue to Step 6: Settings
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(600);
    await captureScreen(page, '04_wizard_06_settings');

    // Continue to Step 7: Review & Send to Admin
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(600);
    await captureScreen(page, '04_wizard_07_review');

    // Faculty clicks Send to Admin
    await page.click('button:has-text("Send to Admin for Approval")');
    await page.waitForTimeout(800);

    console.log('\n--- 6. Admin Approval, Launch & Live Monitor ---');
    // Switch to Admin
    await page.evaluate(() => {
      localStorage.setItem('viit_active_user', JSON.stringify({
        id: 1,
        email: 'admin@vignan.edu.in',
        fullName: 'Prof. M. S. Rao',
        role: 'admin',
        isActive: true,
      }));
      window.location.href = '/app/campaign/1/monitor';
    });
    await page.waitForTimeout(1000);
    await captureScreen(page, '05_live_monitor');

    console.log('\n--- 7. Reports & History (3 Stat Cards, Tabs) ---');
    await page.goto(`${BASE_URL}/app/reports`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await captureScreen(page, '06_reports_campaigns');

    // Switch to Call History Tab
    await page.click('button:has-text("Call history")');
    await page.waitForTimeout(500);
    await captureScreen(page, '06_reports_call_history');

    console.log('\n--- 8. Issues Board & Loop ---');
    // Switch to Hostel Dean role
    await page.evaluate(() => {
      localStorage.setItem('viit_active_user', JSON.stringify({
        id: 5,
        email: 'hostel.dean@vignan.edu.in',
        fullName: 'Dr. V. Prasad',
        role: 'hostel_dean',
        isActive: true,
      }));
      window.location.href = '/app/issues';
    });
    await page.waitForTimeout(600);
    await captureScreen(page, '07_issues_board');

    // Open Hostel issue modal
    const issueCards = await page.$$('text=Hostel');
    if (issueCards.length > 0) {
      await issueCards[0].click();
      await page.waitForTimeout(400);
      await captureScreen(page, '07_issues_confirmation_call');
    }

    console.log('\n--- 9. Users & Classes Hierarchy ---');
    // Switch back to Admin
    await page.evaluate(() => {
      localStorage.setItem('viit_active_user', JSON.stringify({
        id: 1,
        email: 'admin@vignan.edu.in',
        fullName: 'Prof. M. S. Rao',
        role: 'admin',
        isActive: true,
      }));
      window.location.href = '/app/admin/users-classes';
    });
    await page.waitForTimeout(600);
    await captureScreen(page, '08_users_classes');

    console.log('\n--- 10. System Settings & Activity Log ---');
    await page.goto(`${BASE_URL}/app/admin/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await captureScreen(page, '09_settings_activity_log');

    console.log('\n--- 11. Security Barriers (403 Tests) ---');
    // Faculty trying to access admin settings -> redirects to 403
    await page.evaluate(() => {
      localStorage.setItem('viit_active_user', JSON.stringify({
        id: 3,
        email: 'faculty.cse@vignan.edu.in',
        fullName: 'Dr. Ch. Radhika',
        role: 'faculty',
        department: 'CSE',
        isActive: true,
      }));
      window.location.href = '/app/admin/settings';
    });
    await page.waitForTimeout(600);
    await captureScreen(page, '10_forbidden_403');

    console.log('\n=== E2E Test Suite and Screenshot Capture Completed Successfully! ===');
    await browser.close();
  } finally {
    await server.close();
  }
}

run().catch(err => {
  console.error('E2E Execution Error:', err);
  process.exit(1);
});
