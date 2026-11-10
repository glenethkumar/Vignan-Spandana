export type UserRole =
  | 'admin'
  | 'principal'
  | 'faculty'
  | 'college_coordinator'
  | 'hostel_dean'
  | 'bus_correspondent';

export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  department?: string;
  isActive: boolean;
  assignedClasses?: string[]; // e.g. ["CSE / 3 / Section A", "CSE / 3 / Section B"]
}

export interface Department {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
}

export interface AcademicYear {
  id: number;
  departmentId: number;
  yearNumber: number; // 1, 2, 3, 4
  isActive: boolean;
}

export interface Section {
  id: number;
  departmentId: number;
  yearId: number;
  yearNumber: number;
  name: string; // "A", "B", "C"
  studentCount: number;
  isActive: boolean;
}

export interface Student {
  id: number;
  rollNumber: string;
  name: string;
  parentName: string;
  parentPhone: string; // strictly masked: "+91 98*** **345"
  department: string;
  year: number;
  section: string;
  attendanceStatus?: 'Present' | 'Absent';
  marks?: number;
  residenceType?: 'Hostel' | 'Day Scholar';
  busRoute?: string;
  isActive: boolean;
  archivedAt?: string | null;
}

export interface UploadRecord {
  id: number;
  className: string;
  department: string;
  year: number;
  section: string;
  uploadDate: string; // YYYY-MM-DD
  uploadedBy: string;
  fileName: string;
  version: number;
  totalRows: number;
  presentCount: number;
  absentCount: number;
  status: 'active' | 'superseded';
  replacedBy?: number | null;
  createdAt: string;
}

export type CampaignModule = 'mentoring' | 'feedback';
export type CampaignStatus =
  | 'draft'
  | 'pending_approval'
  | 'confirmed'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface QuestionsConfig {
  language: 'Telugu' | 'English' | 'Hindi';
  voiceOption: string;
  purpose: string;
  scriptText: string;
  feedbackTopics: {
    college: boolean;
    hostel: boolean;
    transport: boolean;
  };
  callingHoursStart: string;
  callingHoursEnd: string;
  maxRetries: number;
  maxDurationSeconds: number;
}

export interface Campaign {
  id: number;
  title: string;
  module: CampaignModule;
  department: string;
  year: number;
  section: string;
  attendanceDate: string;
  uploadId: number;
  uploadVersion: number;
  status: CampaignStatus;
  createdBy: string;
  createdByRole: UserRole;
  assignedFaculty?: string;
  totalTargetCalls: number;
  completedCalls: number;
  pendingCalls: number;
  failedCalls: number;
  questionsConfig: QuestionsConfig;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  adminNote?: string | null;
}

export type CallStatus =
  | 'queued'
  | 'calling'
  | 'connected'
  | 'completed'
  | 'no_answer'
  | 'failed';

export interface CallRecord {
  id: number;
  campaignId: number;
  studentId: number;
  studentName: string;
  rollNumber: string;
  parentName: string;
  maskedPhone: string;
  status: CallStatus;
  durationSeconds: number;
  startedAt?: string;
  endedAt?: string;
  transcriptTelugu?: string;
  transcriptEnglish?: string;
  aiSummary?: string;
  outcome?: string;
  issueId?: number | null;
}

export type IssueCategory = 'College' | 'Hostel' | 'Bus';
export type IssueStatus =
  | 'open'
  | 'owner_alerted'
  | 'in_progress'
  | 'resolved'
  | 'confirmation_pending'
  | 'closed'
  | 'reopened';

export interface IssueTimelineEvent {
  id: number;
  issueId: number;
  statusFrom: IssueStatus;
  statusTo: IssueStatus;
  performedBy: string;
  comment: string;
  timestamp: string;
}

export interface Issue {
  id: number;
  category: IssueCategory;
  studentId: number;
  studentName: string;
  rollNumber: string;
  department: string;
  year: number;
  section: string;
  campaignId: number;
  callId: number;
  parentFeedback: string;
  status: IssueStatus;
  reopenCount: number;
  isCritical: boolean; // true if reopenCount >= 3
  ownerName: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
  timeline: IssueTimelineEvent[];
}

export interface ActivityLogEntry {
  id: number;
  actionType:
    | 'login'
    | 'upload'
    | 'campaign_created'
    | 'campaign_submitted'
    | 'campaign_started'
    | 'campaign_paused'
    | 'campaign_stopped'
    | 'issue_updated'
    | 'issue_resolved'
    | 'confirmation_call'
    | 'structure_change'
    | 'user_assignment'
    | 'report_export'
    | 'settings_update';
  userName: string;
  userRole: UserRole;
  targetEntity: string;
  details: string;
  timestamp: string;
}

export interface SystemSettings {
  institutionName: string;
  departmentName: string;
  defaultLanguage: 'Telugu' | 'English' | 'Hindi';
  callingHoursStart: string;
  callingHoursEnd: string;
  maxCallDurationSeconds: number;
  retryAttempts: number;
  phoneMaskingEnforced: boolean;
  demoMode: boolean;
}

export interface DashboardSummary {
  absentToday: number;
  callsCompleted: number;
  openIssuesCount: number;
  resolvedThisWeek: number;
  recentCampaigns: Campaign[];
  openIssues: Issue[];
  pendingApprovals: Campaign[];
}
