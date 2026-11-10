import * as XLSX from 'xlsx';
import { maskPhoneNumber } from './masking';

export interface ParsedRow {
  rollNumber: string;
  name: string;
  parentName: string;
  parentPhone: string;
  attendanceStatus?: 'Present' | 'Absent';
  language?: string;
  marks?: number;
  residenceType?: 'Hostel' | 'Day Scholar';
  busRoute?: string;
  department?: string;
  year?: number;
  section?: string;
  rawRowNumber: number;
}

export interface ValidationError {
  rowNumber: number;
  rollNumber?: string;
  field: string;
  message: string;
  isBlocking: boolean; // true = blocking error; false = warning (e.g. excluded from campaign)
}

export interface ExcelValidationResult {
  isValid: boolean; // true if zero blocking errors
  totalRows: number;
  presentCount: number;
  absentCount: number;
  usablePhoneCount: number;
  excludedCount: number;
  errors: ValidationError[];
  validRows: ParsedRow[];
  excludedRows: ParsedRow[];
}

export const REQUIRED_COLUMNS = [
  'roll_number',
  'student_name',
  'parent_name',
  'parent_phone',
  'attendance_status',
];

export const OPTIONAL_COLUMNS = [
  'language',
  'marks',
  'hostel_or_day_scholar',
  'bus_route',
  'department',
  'year',
  'section',
];

/**
 * Generates an institutional .xlsx template for attendance / feedback uploads.
 */
export function generateExcelTemplate(): Uint8Array {
  const headers = [
    'roll_number',
    'student_name',
    'parent_name',
    'parent_phone',
    'attendance_status',
    'language',
    'marks',
    'hostel_or_day_scholar',
    'bus_route',
    'department',
    'year',
    'section',
  ];

  const sampleRows = [
    [
      '21L31A0501',
      'Aarav Sharma',
      'Suresh Sharma',
      '9848011001',
      'Absent',
      'Telugu',
      84,
      'Day Scholar',
      'Route 12 (Gajuwaka)',
      'CSE',
      3,
      'Section A',
    ],
    [
      '21L31A0502',
      'Bhavya Reddy',
      'Venkat Reddy',
      '9848011002',
      'Present',
      'Telugu',
      91,
      'Hostel',
      '',
      'CSE',
      3,
      'Section A',
    ],
    [
      '21L31A0503',
      'Chaitanya Varma',
      'Raju Varma',
      '9848011003',
      'Absent',
      'Telugu',
      72,
      'Day Scholar',
      'Route 04 (NAD)',
      'CSE',
      3,
      'Section A',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance_Template');
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}

/**
 * Downloads a generated Excel workbook in the browser.
 */
export function downloadFile(buffer: Uint8Array | ArrayBuffer | any, fileName: string, mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'): void {
  const blob = new Blob([buffer as any], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Reads an uploaded file (.xlsx, .xls, .csv) and returns column headers and raw row objects.
 */
export async function readUploadedSpreadsheet(file: File): Promise<{
  headers: string[];
  rawRows: Record<string, any>[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { header: 1 });
        
        if (!jsonRows || jsonRows.length === 0) {
          throw new Error('The uploaded spreadsheet contains no data.');
        }

        const rawHeaders = (jsonRows[0] as string[]).map(h => String(h || '').trim());
        const dataRows: Record<string, any>[] = [];

        for (let i = 1; i < jsonRows.length; i++) {
          const rowVals = jsonRows[i] as any[];
          if (!rowVals || rowVals.length === 0 || rowVals.every(v => v === undefined || v === null || String(v).trim() === '')) {
            continue; // Skip empty rows
          }
          const rowObj: Record<string, any> = {};
          rawHeaders.forEach((header, colIdx) => {
            rowObj[header] = rowVals[colIdx];
          });
          dataRows.push(rowObj);
        }

        resolve({ headers: rawHeaders, rawRows: dataRows });
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to read spreadsheet file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file from disk'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Validates parsed rows against institutional rules and campaign constraints.
 */
export function validateStudentRows(
  rows: Record<string, any>[],
  columnMap: Record<string, string>, // standardCol -> fileCol
  expectedClass: { department: string; year: number; section: string },
  module: 'mentoring' | 'feedback'
): ExcelValidationResult {
  const errors: ValidationError[] = [];
  const validRows: ParsedRow[] = [];
  const excludedRows: ParsedRow[] = [];

  const seenRollNumbers = new Set<string>();
  let presentCount = 0;
  let absentCount = 0;
  let usablePhoneCount = 0;

  rows.forEach((rawRow, idx) => {
    const rowNum = idx + 2; // Accounting for 1-based index and header row
    const rollNumber = String(rawRow[columnMap['roll_number']] || '').trim().toUpperCase();
    const name = String(rawRow[columnMap['student_name']] || '').trim();
    const parentName = String(rawRow[columnMap['parent_name']] || '').trim();
    const rawPhone = String(rawRow[columnMap['parent_phone']] || '').trim();
    const rawAttendance = String(rawRow[columnMap['attendance_status']] || '').trim().toLowerCase();

    // Optional fields
    const language = String(rawRow[columnMap['language']] || 'Telugu').trim();
    const marks = rawRow[columnMap['marks']] !== undefined ? Number(rawRow[columnMap['marks']]) : undefined;
    const residenceType = rawRow[columnMap['hostel_or_day_scholar']] ? (String(rawRow[columnMap['hostel_or_day_scholar']]).toLowerCase().includes('hostel') ? 'Hostel' : 'Day Scholar') : undefined;
    const busRoute = String(rawRow[columnMap['bus_route']] || '').trim() || undefined;
    const rowDept = rawRow[columnMap['department']] ? String(rawRow[columnMap['department']]).trim().toUpperCase() : undefined;
    const rowYear = rawRow[columnMap['year']] ? Number(rawRow[columnMap['year']]) : undefined;
    const rowSection = rawRow[columnMap['section']] ? String(rawRow[columnMap['section']]).trim() : undefined;

    let hasBlockingError = false;

    // 1. Missing roll number
    if (!rollNumber) {
      errors.push({
        rowNumber: rowNum,
        field: 'roll_number',
        message: 'Roll number is required.',
        isBlocking: true,
      });
      hasBlockingError = true;
    } else if (seenRollNumbers.has(rollNumber)) {
      // 2. Duplicate roll numbers
      errors.push({
        rowNumber: rowNum,
        rollNumber,
        field: 'roll_number',
        message: `Duplicate roll number "${rollNumber}" found. Roll numbers must be unique.`,
        isBlocking: true,
      });
      hasBlockingError = true;
    } else {
      seenRollNumbers.add(rollNumber);
    }

    // 3. Student name
    if (!name) {
      errors.push({
        rowNumber: rowNum,
        rollNumber,
        field: 'student_name',
        message: 'Student name is required.',
        isBlocking: true,
      });
      hasBlockingError = true;
    }

    // 4. Attendance status validation (BLOCKING for Module A)
    let parsedAttendance: 'Present' | 'Absent' | undefined;
    if (rawAttendance === 'p' || rawAttendance === 'present' || rawAttendance === '1') {
      parsedAttendance = 'Present';
      presentCount++;
    } else if (rawAttendance === 'a' || rawAttendance === 'absent' || rawAttendance === '0') {
      parsedAttendance = 'Absent';
      absentCount++;
    } else {
      if (module === 'mentoring') {
        errors.push({
          rowNumber: rowNum,
          rollNumber,
          field: 'attendance_status',
          message: `Invalid attendance value "${rawAttendance}". Must be "Present" or "Absent".`,
          isBlocking: true,
        });
        hasBlockingError = true;
      }
    }

    // 5. Department / Year / Section mismatch (if present in row)
    if (rowDept && rowDept !== expectedClass.department.toUpperCase()) {
      errors.push({
        rowNumber: rowNum,
        rollNumber,
        field: 'department',
        message: `Department "${rowDept}" does not match selected class "${expectedClass.department}".`,
        isBlocking: true,
      });
      hasBlockingError = true;
    }
    if (rowYear && rowYear !== expectedClass.year) {
      errors.push({
        rowNumber: rowNum,
        rollNumber,
        field: 'year',
        message: `Year "${rowYear}" does not match selected class year "${expectedClass.year}".`,
        isBlocking: true,
      });
      hasBlockingError = true;
    }
    if (rowSection && !expectedClass.section.toLowerCase().includes(rowSection.toLowerCase())) {
      errors.push({
        rowNumber: rowNum,
        rollNumber,
        field: 'section',
        message: `Section "${rowSection}" does not match selected section "${expectedClass.section}".`,
        isBlocking: true,
      });
      hasBlockingError = true;
    }

    // 6. Parent phone check (NON-BLOCKING warning; excludes student)
    const phoneDigits = rawPhone.replace(/\D/g, '');
    const isPhoneValid = phoneDigits.length >= 10;

    if (!isPhoneValid) {
      errors.push({
        rowNumber: rowNum,
        rollNumber,
        field: 'parent_phone',
        message: `Missing or invalid phone number "${rawPhone}". Student will be excluded from calling queue.`,
        isBlocking: false,
      });
    } else {
      usablePhoneCount++;
    }

    // 7. Missing parent name warning (non-blocking)
    if (!parentName) {
      errors.push({
        rowNumber: rowNum,
        rollNumber,
        field: 'parent_name',
        message: 'Parent name missing. Default "Parent/Guardian" will be used.',
        isBlocking: false,
      });
    }

    const parsedRow: ParsedRow = {
      rollNumber,
      name,
      parentName: parentName || 'Parent / Guardian',
      parentPhone: maskPhoneNumber(rawPhone),
      attendanceStatus: parsedAttendance,
      language,
      marks,
      residenceType,
      busRoute,
      department: expectedClass.department,
      year: expectedClass.year,
      section: expectedClass.section,
      rawRowNumber: rowNum,
    };

    if (hasBlockingError) {
      // Excluded due to blocking error
    } else if (!isPhoneValid) {
      excludedRows.push(parsedRow);
    } else {
      validRows.push(parsedRow);
    }
  });

  const hasBlockingErrors = errors.some(e => e.isBlocking);

  return {
    isValid: !hasBlockingErrors,
    totalRows: rows.length,
    presentCount,
    absentCount,
    usablePhoneCount,
    excludedCount: excludedRows.length,
    errors,
    validRows,
    excludedRows,
  };
}

/**
 * Exports errors as an Excel workbook for the user to download and correct.
 */
export function generateErrorsExcel(errors: ValidationError[]): Uint8Array {
  const headers = ['Row Number', 'Roll Number', 'Field', 'Severity', 'Error Message'];
  const data = errors.map(e => [
    e.rowNumber,
    e.rollNumber || '—',
    e.field,
    e.isBlocking ? 'BLOCKING ERROR' : 'WARNING (Excluded)',
    e.message,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Validation_Errors');
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}
