import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateStudentRows,
  generateExcelTemplate,
  generateErrorsExcel,
} from '../../src/lib/excel';
import {
  saveDraftCampaign,
  submitToAdmin,
  confirmCampaign,
  checkDuplicateUpload,
  saveUpload,
} from '../../src/data/api';

describe('Milestones M2, M3, M4: Campaign Wizard & Excel Validation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('generates institutional Excel template with standard columns', () => {
    const templateBytes = generateExcelTemplate();
    expect(templateBytes).toBeDefined();
    expect(templateBytes.length).toBeGreaterThan(100);
  });

  it('detects duplicate roll numbers as a BLOCKING error', () => {
    const testRows = [
      { roll_number: '21L31A0501', student_name: 'Aarav Sharma', parent_name: 'Suresh', parent_phone: '9848011001', attendance_status: 'Absent' },
      { roll_number: '21L31A0501', student_name: 'Duplicate Aarav', parent_name: 'Suresh', parent_phone: '9848011001', attendance_status: 'Absent' },
    ];
    const mapping = {
      roll_number: 'roll_number',
      student_name: 'student_name',
      parent_name: 'parent_name',
      parent_phone: 'parent_phone',
      attendance_status: 'attendance_status',
    };

    const res = validateStudentRows(testRows, mapping, { department: 'CSE', year: 3, section: 'Section A' }, 'mentoring');
    expect(res.isValid).toBe(false);
    expect(res.errors.some(e => e.isBlocking && e.field === 'roll_number' && e.message.includes('Duplicate'))).toBe(true);
  });

  it('detects unknown attendance status as a BLOCKING error for Module A (mentoring)', () => {
    const testRows = [
      { roll_number: '21L31A0501', student_name: 'Aarav Sharma', parent_name: 'Suresh', parent_phone: '9848011001', attendance_status: 'Maybe' },
    ];
    const mapping = {
      roll_number: 'roll_number',
      student_name: 'student_name',
      parent_name: 'parent_name',
      parent_phone: 'parent_phone',
      attendance_status: 'attendance_status',
    };

    const res = validateStudentRows(testRows, mapping, { department: 'CSE', year: 3, section: 'Section A' }, 'mentoring');
    expect(res.isValid).toBe(false);
    expect(res.errors.some(e => e.isBlocking && e.field === 'attendance_status')).toBe(true);
  });

  it('detects department mismatch as a BLOCKING error', () => {
    const testRows = [
      { roll_number: '21L31A0501', student_name: 'Aarav Sharma', parent_name: 'Suresh', parent_phone: '9848011001', attendance_status: 'Present', department: 'ECE' },
    ];
    const mapping = {
      roll_number: 'roll_number',
      student_name: 'student_name',
      parent_name: 'parent_name',
      parent_phone: 'parent_phone',
      attendance_status: 'attendance_status',
      department: 'department',
    };

    const res = validateStudentRows(testRows, mapping, { department: 'CSE', year: 3, section: 'Section A' }, 'mentoring');
    expect(res.isValid).toBe(false);
    expect(res.errors.some(e => e.isBlocking && e.field === 'department')).toBe(true);
  });

  it('treats missing/invalid parent phone as a NON-BLOCKING warning (excludes student from queue)', () => {
    const testRows = [
      { roll_number: '21L31A0501', student_name: 'Aarav Sharma', parent_name: 'Suresh', parent_phone: '123', attendance_status: 'Absent' },
      { roll_number: '21L31A0502', student_name: 'Bhavya Reddy', parent_name: 'Venkat', parent_phone: '9848011002', attendance_status: 'Absent' },
    ];
    const mapping = {
      roll_number: 'roll_number',
      student_name: 'student_name',
      parent_name: 'parent_name',
      parent_phone: 'parent_phone',
      attendance_status: 'attendance_status',
    };

    const res = validateStudentRows(testRows, mapping, { department: 'CSE', year: 3, section: 'Section A' }, 'mentoring');
    // Non-blocking warning means campaign is allowed to proceed
    expect(res.isValid).toBe(true);
    expect(res.excludedCount).toBe(1);
    expect(res.excludedRows[0].rollNumber).toBe('21L31A0501');
    expect(res.validRows.length).toBe(1);
  });

  it('handles re-upload of same class and date with Version replacement', async () => {
    const upload1 = await saveUpload({
      className: 'CSE / Year 3 / Section A',
      department: 'CSE',
      year: 3,
      section: 'Section A',
      uploadDate: '2026-11-10',
      uploadedBy: 'Prof. Ramesh',
      fileName: 'CSE_3A_v1.xlsx',
      version: 1,
      totalRows: 20,
      presentCount: 15,
      absentCount: 5,
      status: 'active',
    });
    expect(upload1.version).toBe(1);

    const dup = await checkDuplicateUpload('CSE', 3, 'Section A', '2026-11-10');
    expect(dup).not.toBeNull();
    expect(dup?.id).toBe(upload1.id);

    const upload2 = await saveUpload({
      className: 'CSE / Year 3 / Section A',
      department: 'CSE',
      year: 3,
      section: 'Section A',
      uploadDate: '2026-11-10',
      uploadedBy: 'Prof. Ramesh',
      fileName: 'CSE_3A_v2.xlsx',
      version: 1,
      totalRows: 20,
      presentCount: 14,
      absentCount: 6,
      status: 'active',
    });

    expect(upload2.version).toBe(2);
    expect(upload2.status).toBe('active');
  });

  it('enforces campaign permissions: faculty submits to admin, admin confirms', async () => {
    const draft = await saveDraftCampaign({
      department: 'CSE',
      year: 3,
      section: 'Section A',
      module: 'mentoring',
      attendanceDate: '2026-11-10',
      totalTargetCalls: 5,
      status: 'draft',
    });
    expect(draft.status).toBe('draft');

    // Faculty submits to admin
    const submitted = await submitToAdmin(draft.id);
    expect(submitted.status).toBe('pending_approval');

    // Admin confirms and starts
    const confirmed = await confirmCampaign(draft.id);
    expect(confirmed.status).toBe('in_progress');
    expect(confirmed.startedAt).toBeDefined();
  });
});
