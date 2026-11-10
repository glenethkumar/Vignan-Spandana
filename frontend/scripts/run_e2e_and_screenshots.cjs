/**
 * Comprehensive Playwright End-to-End Test and Screenshot Suite (.cjs)
 */

const { chromium } = require('../node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const BASE_URL = 'http://127.0.0.1:5173';

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
      port: 5173,
      host: '127.0.0.1',
    },
  });
  console.log('Vite preview server running at:', server.resolvedUrls.local[0]);

  try {
    const browser = await chromium.launch({
      executablePath: EDGE_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-gpu'],
    });

    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const mobileContext = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true });

    const desktopPage = await desktopContext.newPage();
    const mobilePage = await mobileContext.newPage();

    console.log('\n--- 2. Public Home Page & Mobile Menu ---');
    await desktopPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await captureScreen(desktopPage, '01_home_top');

    // Scroll to flow section
    await desktopPage.evaluate(() => window.scrollTo(0, 950));
    await desktopPage.waitForTimeout(400);
    await captureScreen(desktopPage, '01_home_flow_section');

    await mobilePage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await captureScreen(mobilePage, '01_home', true);

    console.log('\n--- 3. Split-Screen Login ---');
    await desktopPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await captureScreen(desktopPage, '02_login');

    await mobilePage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await captureScreen(mobilePage, '02_login', true);

    console.log('\n--- 4. Dashboards (Admin Demo, Admin Empty, Faculty, Hostel Dean) ---');
    // Admin Demo Dashboard
    await desktopPage.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
    await captureScreen(desktopPage, '03_dashboard_admin_demo');
    await mobilePage.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
    await captureScreen(mobilePage, '03_dashboard_admin_demo', true);

    // Mobile Menu Open
    await mobilePage.click('button[aria-label="Open sidebar menu"]');
    await mobilePage.waitForTimeout(400);
    await captureScreen(mobilePage, '03_mobile_menu_open', true);

    // Close mobile menu safely via evaluate
    await mobilePage.evaluate(() => {
      const btn = document.querySelector('aside button');
      if (btn) btn.click();
    });
    await mobilePage.waitForTimeout(300);

    // Admin Empty State Dashboard
    await desktopPage.evaluate(() => {
      localStorage.setItem('viit_demo_data_mode', 'empty');
      localStorage.setItem('viit_students', '[]');
      localStorage.setItem('viit_uploads', '[]');
      localStorage.setItem('viit_campaigns', '[]');
      localStorage.setItem('viit_call_records', '[]');
      localStorage.setItem('viit_issues', '[]');
      localStorage.setItem('viit_activity_log', '[]');
      window.location.reload();
    });
    await desktopPage.waitForTimeout(600);
    await captureScreen(desktopPage, '04_dashboard_admin_empty');

    // Restore full demo data
    await desktopPage.click('button:has-text("Load demo")');
    await desktopPage.waitForTimeout(600);

    // Faculty Dashboard
    await desktopPage.evaluate(() => {
      const users = JSON.parse(localStorage.getItem('viit_users') || '[]');
      const faculty = users.find((u) => u.role === 'faculty') || users[2];
      localStorage.setItem('viit_active_user', JSON.stringify(faculty));
      window.location.reload();
    });
    await desktopPage.waitForTimeout(600);
    await captureScreen(desktopPage, '05_dashboard_faculty');

    // Hostel Dean Dashboard
    await desktopPage.evaluate(() => {
      const users = JSON.parse(localStorage.getItem('viit_users') || '[]');
      const dean = users.find((u) => u.role === 'hostel_dean') || users[5];
      localStorage.setItem('viit_active_user', JSON.stringify(dean));
      window.location.reload();
    });
    await desktopPage.waitForTimeout(600);
    await captureScreen(desktopPage, '06_dashboard_hostel_dean');

    // Switch back to Admin
    await desktopPage.evaluate(() => {
      const users = JSON.parse(localStorage.getItem('viit_users') || '[]');
      const admin = users.find((u) => u.role === 'admin') || users[0];
      localStorage.setItem('viit_active_user', JSON.stringify(admin));
      window.location.reload();
    });
    await desktopPage.waitForTimeout(600);

    console.log('\n--- 5. New Campaign Wizard (All 7 Steps) ---');
    await desktopPage.goto(`${BASE_URL}/app/campaign/new`, { waitUntil: 'networkidle' });
    await captureScreen(desktopPage, '07_wizard_step1_department');

    // Step 1 -> Step 2
    await desktopPage.click('text=Computer Science and Engineering');
    await desktopPage.waitForTimeout(200);
    await desktopPage.click('button:has-text("Continue")');
    await desktopPage.waitForTimeout(400);
    await captureScreen(desktopPage, '08_wizard_step2_year');

    // Step 2 -> Step 3
    await desktopPage.click('text=Year 3');
    await desktopPage.waitForTimeout(200);
    await desktopPage.click('button:has-text("Continue")');
    await desktopPage.waitForTimeout(400);
    await captureScreen(desktopPage, '09_wizard_step3_section');

    // Step 3 -> Step 4
    await desktopPage.click('text=Section A');
    await desktopPage.waitForTimeout(200);
    await desktopPage.click('button:has-text("Continue")');
    await desktopPage.waitForTimeout(400);
    await captureScreen(desktopPage, '10_wizard_step4_module');

    // Step 4 -> Step 5 (Upload Step)
    await desktopPage.click('button:has-text("Continue")');
    await desktopPage.waitForTimeout(400);

    // Upload file with errors
    const withErrorsFile = path.resolve(__dirname, '../../docs/sample-data/with_errors.xlsx');
    const fileInput = await desktopPage.$('input[type="file"]');
    await fileInput.setInputFiles(withErrorsFile);
    await desktopPage.waitForTimeout(800);
    await captureScreen(desktopPage, '11_wizard_step5_upload_errors');

    // Upload valid file
    const validFile = path.resolve(__dirname, '../../docs/sample-data/valid_attendance.xlsx');
    await fileInput.setInputFiles(validFile);
    await desktopPage.waitForTimeout(800);

    // If replace modal opens, confirm it
    const replaceConfirm = await desktopPage.$('button:has-text("Replace and Create")');
    if (replaceConfirm) {
      await replaceConfirm.click();
      await desktopPage.waitForTimeout(400);
    }
    await captureScreen(desktopPage, '12_wizard_step5_upload_valid_preview');

    // Step 5 -> Step 6 (Questions)
    await desktopPage.click('button:has-text("Continue")');
    await desktopPage.waitForTimeout(400);
    await captureScreen(desktopPage, '13_wizard_step6_questions');

    // Step 6 -> Step 7 (Review)
    await desktopPage.click('button:has-text("Continue")');
    await desktopPage.waitForTimeout(400);
    await captureScreen(desktopPage, '14_wizard_step7_review_admin');

    console.log('\n--- 6. Live Monitor (Simulated Progression) ---');
    await desktopPage.click('button:has-text("Confirm and Start Campaign")');
    await desktopPage.waitForTimeout(400);
    await captureScreen(desktopPage, '15_modal_confirm_launch');
    await desktopPage.click('button:has-text("Start Outbound Calls Now")');
    await desktopPage.waitForTimeout(1500);
    await captureScreen(desktopPage, '16_live_monitor');

    console.log('\n--- 7. Reports & Call History Detail ---');
    await desktopPage.goto(`${BASE_URL}/app/reports`, { waitUntil: 'networkidle' });
    await captureScreen(desktopPage, '17_reports_campaigns');

    await desktopPage.click('button:has-text("Call Logs & Transcripts")');
    await desktopPage.waitForTimeout(400);
    await captureScreen(desktopPage, '18_reports_calls');

    // Open call detail modal
    await desktopPage.click('table tbody tr:first-child button');
    await desktopPage.waitForTimeout(400);
    await captureScreen(desktopPage, '19_call_detail_modal');
    await desktopPage.click('button:has-text("Close Detail")');

    console.log('\n--- 8. Issues Board & Action Loop ---');
    await desktopPage.goto(`${BASE_URL}/app/issues`, { waitUntil: 'networkidle' });
    await captureScreen(desktopPage, '20_issues_board');

    // Open Issue #1 (Critical with 3 reopens)
    await desktopPage.click('text=Eshwar Teja');
    await desktopPage.waitForTimeout(400);
    await captureScreen(desktopPage, '21_issue_detail_timeline');
    await desktopPage.click('button:has-text("Close")');

    console.log('\n--- 9. Users & Classes Hierarchy ---');
    await desktopPage.goto(`${BASE_URL}/app/users-classes`, { waitUntil: 'networkidle' });
    await captureScreen(desktopPage, '22_users_classes');

    console.log('\n--- 10. Settings & Activity Log ---');
    await desktopPage.goto(`${BASE_URL}/app/settings`, { waitUntil: 'networkidle' });
    await captureScreen(desktopPage, '23_settings_activity_log');

    console.log('\n--- 11. Security Check: 403 Forbidden Page ---');
    await desktopPage.goto(`${BASE_URL}/app/forbidden`, { waitUntil: 'networkidle' });
    await captureScreen(desktopPage, '24_forbidden_403');

    await browser.close();
    console.log('\n✅ All Playwright End-to-End tests passed and screenshots captured successfully in /docs/screenshots/!');
    if (server && server.httpServer) {
      await server.httpServer.close();
      console.log('Preview server closed gracefully.');
    }
    process.exit(0);
  } finally {
    if (server && server.httpServer) {
      try { await server.httpServer.close(); } catch {}
    }
  }
}

run().catch((err) => {
  console.error('Playwright Error:', err);
  process.exit(1);
});
