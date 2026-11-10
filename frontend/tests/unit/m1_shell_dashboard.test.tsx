import { describe, it, expect, beforeEach } from 'vitest';
import { maskPhoneNumber, containsRawPhoneNumber } from '../../src/lib/masking';
import { getDashboardSummary, setDemoDataMode, getDemoDataMode, listIssues } from '../../src/data/api';

describe('Milestone M1: Shell, Auth & Masking Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('masks phone numbers across multiple raw string formats', () => {
    // 10 digits
    expect(maskPhoneNumber('9848011001')).toBe('+91 98*** **001');
    // with country code
    expect(maskPhoneNumber('+91 98480 11002')).toBe('+91 98*** **002');
    // with spaces
    expect(maskPhoneNumber('+91 9848011003')).toBe('+91 98*** **003');
    // with dashes
    expect(maskPhoneNumber('98-480-11004')).toBe('+91 98*** **004');
    // null or undefined
    expect(maskPhoneNumber(null)).toBe('+91 98*** **000');
  });

  it('detects unmasked raw phone numbers correctly', () => {
    expect(containsRawPhoneNumber('Call parent at 9848011001')).toBe(true);
    expect(containsRawPhoneNumber('+91 98480 11001')).toBe(true);
    expect(containsRawPhoneNumber('Call parent at +91 98*** **345')).toBe(false);
  });

  it('toggles demo data mode between full demo and empty states', async () => {
    setDemoDataMode('demo');
    expect(getDemoDataMode()).toBe('demo');
    const demoSummary = await getDashboardSummary('admin');
    expect(demoSummary.absentToday).toBeGreaterThan(0);
    expect(demoSummary.recentCampaigns.length).toBeGreaterThan(0);

    setDemoDataMode('empty');
    expect(getDemoDataMode()).toBe('empty');
    const emptySummary = await getDashboardSummary('admin');
    expect(emptySummary.absentToday).toBe(0);
    expect(emptySummary.callsCompleted).toBe(0);
    expect(emptySummary.recentCampaigns.length).toBe(0);
  });

  it('scopes dashboard issues by role for issue owners', async () => {
    setDemoDataMode('demo');
    // Hostel Dean sees only Hostel issues
    const hostelSummary = await getDashboardSummary('hostel_dean');
    expect(hostelSummary.openIssues.every(i => i.category === 'Hostel')).toBe(true);

    // Bus Correspondent sees only Bus issues
    const busSummary = await getDashboardSummary('bus_correspondent');
    expect(busSummary.openIssues.every(i => i.category === 'Bus')).toBe(true);

    // College Coordinator sees only College issues
    const collegeSummary = await getDashboardSummary('college_coordinator');
    expect(collegeSummary.openIssues.every(i => i.category === 'College')).toBe(true);
  });
});

