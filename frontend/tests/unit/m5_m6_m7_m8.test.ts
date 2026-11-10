import { describe, it, expect, beforeEach } from 'vitest';
import {
  listIssues,
  getIssue,
  updateIssueStatus,
  runConfirmationCall,
  listCallHistory,
  listCampaigns,
  listActivityLog,
  getSettings,
  saveSettings,
  setDemoDataMode,
} from '../../src/data/api';
import { maskPhoneNumber, containsRawPhoneNumber } from '../../src/lib/masking';

describe('Milestones M5, M6, M7, M8: Issues Loop, Transcripts, Reports, Settings', () => {
  beforeEach(() => {
    localStorage.clear();
    setDemoDataMode('demo');
  });

  it('runs complete issue resolution loop: In Progress -> Resolved -> Parent No (Reopen) -> Resolved -> Parent Yes (Closed)', async () => {
    const issues = await listIssues();
    const target = issues[0];
    expect(target).toBeDefined();

    // 1. Move to in_progress
    const inProgress = await updateIssueStatus(target.id, 'in_progress', 'Technician dispatched', 'Hostel Dean');
    expect(inProgress.status).toBe('in_progress');

    // 2. Mark resolved with notes
    const resolved = await updateIssueStatus(target.id, 'resolved', 'Fixed filter', 'Hostel Dean', 'Connector replaced');
    expect(resolved.status).toBe('resolved');

    // 3. Parent confirmation call says "No" (reopens issue)
    const initialReopenCount = resolved.reopenCount;
    const reopened = await runConfirmationCall(target.id, 'No');
    expect(reopened.status).toBe('reopened');
    expect(reopened.reopenCount).toBe(initialReopenCount + 1);

    // 4. Owner resolves again
    await updateIssueStatus(target.id, 'resolved', 'Secondary fix applied', 'Hostel Dean');

    // 5. Parent confirmation call says "Yes" (closes issue)
    const closed = await runConfirmationCall(target.id, 'Yes');
    expect(closed.status).toBe('closed');
  });

  it('enforces 3-reopen critical flag rule while keeping the resolution loop running', async () => {
    const issues = await listIssues();
    const issue1 = issues.find(i => i.id === 1);
    expect(issue1).toBeDefined();
    // In demo data, Issue #1 already has 3 reopens and is critical
    expect(issue1?.reopenCount).toBeGreaterThanOrEqual(3);
    expect(issue1?.isCritical).toBe(true);

    // Verify the loop STILL runs on critical issues (does not deadlock or freeze)
    await updateIssueStatus(issue1!.id, 'resolved', 'Emergency contractor', 'Hostel Dean');
    const fourthReopen = await runConfirmationCall(issue1!.id, 'No');
    expect(fourthReopen.status).toBe('reopened');
    expect(fourthReopen.reopenCount).toBe(4);
    expect(fourthReopen.isCritical).toBe(true);
  });

  it('strictly isolates issue categories by role', async () => {
    // College Coordinator only sees College issues
    const collegeIssues = await listIssues({ role: 'college_coordinator' });
    expect(collegeIssues.length).toBeGreaterThan(0);
    expect(collegeIssues.every(i => i.category === 'College')).toBe(true);

    // Hostel Dean only sees Hostel issues
    const hostelIssues = await listIssues({ role: 'hostel_dean' });
    expect(hostelIssues.length).toBeGreaterThan(0);
    expect(hostelIssues.every(i => i.category === 'Hostel')).toBe(true);

    // Bus Correspondent only sees Bus issues
    const busIssues = await listIssues({ role: 'bus_correspondent' });
    expect(busIssues.length).toBeGreaterThan(0);
    expect(busIssues.every(i => i.category === 'Bus')).toBe(true);
  });

  it('guarantees call history phone numbers are masked and zero raw numbers exist', async () => {
    const calls = await listCallHistory();
    expect(calls.length).toBeGreaterThan(0);

    calls.forEach(call => {
      expect(call.maskedPhone).toMatch(/^\+91\s\d{2}\*{3}\s\*{2}\d{3}$/);
      expect(containsRawPhoneNumber(call.maskedPhone)).toBe(false);
    });
  });

  it('records every transition in activity log with zero exposed secrets', async () => {
    const logs = await listActivityLog();
    expect(logs.length).toBeGreaterThan(0);

    logs.forEach(entry => {
      expect(entry.details).not.toContain('password');
      expect(containsRawPhoneNumber(entry.details)).toBe(false);
    });
  });

  it('persists system settings updates', async () => {
    const initial = await getSettings();
    expect(initial.institutionName).toContain('Vignan');

    const updated = await saveSettings({ maxCallDurationSeconds: 150 });
    expect(updated.maxCallDurationSeconds).toBe(150);

    const reloaded = await getSettings();
    expect(reloaded.maxCallDurationSeconds).toBe(150);
  });
});

