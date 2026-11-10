import {
  User,
  UserRole,
  Department,
  AcademicYear,
  Section,
  Student,
  UploadRecord,
  Campaign,
  CampaignStatus,
  CallRecord,
  CallStatus,
  Issue,
  IssueCategory,
  IssueStatus,
  ActivityLogEntry,
  SystemSettings,
  DashboardSummary,
} from './types';
import {
  INITIAL_USERS,
  INITIAL_DEPARTMENTS,
  INITIAL_YEARS,
  INITIAL_SECTIONS,
  INITIAL_STUDENTS,
  INITIAL_UPLOADS,
  INITIAL_CAMPAIGNS,
  INITIAL_CALL_RECORDS,
  INITIAL_ISSUES,
  INITIAL_ACTIVITY_LOG,
  INITIAL_SETTINGS,
} from './initialData';
import { maskPhoneNumber } from '../lib/masking';

const STORAGE_KEYS = {
  MODE: 'viit_demo_data_mode',
  USERS: 'viit_users',
  DEPARTMENTS: 'viit_departments',
  YEARS: 'viit_years',
  SECTIONS: 'viit_sections',
  STUDENTS: 'viit_students',
  UPLOADS: 'viit_uploads',
  CAMPAIGNS: 'viit_campaigns',
  CALLS: 'viit_call_records',
  ISSUES: 'viit_issues',
  ACTIVITY_LOG: 'viit_activity_log',
  SETTINGS: 'viit_settings',
  ACTIVE_USER: 'viit_active_user',
};

// Helper: load from localStorage with fallback
function load<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch {
    return fallback;
  }
}

// Helper: save to localStorage
function save<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

// Initialize storage if empty
export function initStorage(forceReset = false): void {
  const currentMode = localStorage.getItem(STORAGE_KEYS.MODE) as 'demo' | 'empty' | null;
  if (!currentMode || forceReset) {
    setDemoDataMode('demo');
  }
}

export function setDemoDataMode(mode: 'demo' | 'empty'): void {
  localStorage.setItem(STORAGE_KEYS.MODE, mode);
  if (mode === 'empty') {
    save(STORAGE_KEYS.USERS, INITIAL_USERS);
    save(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
    save(STORAGE_KEYS.YEARS, INITIAL_YEARS);
    save(STORAGE_KEYS.SECTIONS, INITIAL_SECTIONS);
    save(STORAGE_KEYS.STUDENTS, []);
    save(STORAGE_KEYS.UPLOADS, []);
    save(STORAGE_KEYS.CAMPAIGNS, []);
    save(STORAGE_KEYS.CALLS, []);
    save(STORAGE_KEYS.ISSUES, []);
    save(STORAGE_KEYS.ACTIVITY_LOG, []);
    save(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  } else {
    save(STORAGE_KEYS.USERS, INITIAL_USERS);
    save(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
    save(STORAGE_KEYS.YEARS, INITIAL_YEARS);
    save(STORAGE_KEYS.SECTIONS, INITIAL_SECTIONS);
    save(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    save(STORAGE_KEYS.UPLOADS, INITIAL_UPLOADS);
    save(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
    save(STORAGE_KEYS.CALLS, INITIAL_CALL_RECORDS);
    save(STORAGE_KEYS.ISSUES, INITIAL_ISSUES);
    save(STORAGE_KEYS.ACTIVITY_LOG, INITIAL_ACTIVITY_LOG);
    save(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  }
}

export function getDemoDataMode(): 'demo' | 'empty' {
  return (localStorage.getItem(STORAGE_KEYS.MODE) as 'demo' | 'empty') || 'demo';
}

// Auth simulation
export async function getActiveUser(): Promise<User> {
  const stored = load<User | null>(STORAGE_KEYS.ACTIVE_USER, null);
  if (stored) return stored;
  return INITIAL_USERS[0]; // Admin by default
}

export async function setActiveUser(user: User): Promise<void> {
  save(STORAGE_KEYS.ACTIVE_USER, user);
}

// Dashboard Summary
export async function getDashboardSummary(role: UserRole, department?: string): Promise<DashboardSummary> {
  initStorage();
  const students = load<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS).filter(s => s.isActive);
  const campaigns = load<Campaign[]>(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  const calls = load<CallRecord[]>(STORAGE_KEYS.CALLS, INITIAL_CALL_RECORDS);
  const issues = load<Issue[]>(STORAGE_KEYS.ISSUES, INITIAL_ISSUES);

  // Filter scoped by role
  let scopedCampaigns = campaigns;
  let scopedIssues = issues;

  if (role === 'faculty' && department) {
    scopedCampaigns = campaigns.filter(c => c.department === department);
  } else if (role === 'college_coordinator') {
    scopedIssues = issues.filter(i => i.category === 'College');
  } else if (role === 'hostel_dean') {
    scopedIssues = issues.filter(i => i.category === 'Hostel');
  } else if (role === 'bus_correspondent') {
    scopedIssues = issues.filter(i => i.category === 'Bus');
  }

  const absentToday = students.filter(s => s.attendanceStatus === 'Absent').length;
  const callsCompleted = calls.filter(c => c.status === 'completed').length;
  const openIssuesCount = scopedIssues.filter(i => i.status !== 'closed').length;
  const resolvedThisWeek = scopedIssues.filter(i => i.status === 'resolved' || i.status === 'closed').length;
  const preparedCampaignsCount = scopedCampaigns.length;
  const studentRecordsCount = students.length;

  const recentCampaigns = [...scopedCampaigns].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const openIssues = [...scopedIssues].filter(i => i.status !== 'closed').slice(0, 5);
  const pendingApprovals = campaigns.filter(c => c.status === 'pending_approval').slice(0, 5);

  return {
    preparedCampaignsCount,
    studentRecordsCount,
    absentToday,
    callsCompleted,
    openIssuesCount,
    resolvedThisWeek,
    recentCampaigns,
    openIssues,
    pendingApprovals,
  };
}

// Students
export async function listStudents(filters?: {
  department?: string;
  year?: number;
  section?: string;
  query?: string;
  includeArchived?: boolean;
}): Promise<Student[]> {
  initStorage();
  let students = load<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);

  if (!filters?.includeArchived) {
    students = students.filter(s => s.isActive);
  }

  if (filters?.department) {
    students = students.filter(s => s.department === filters.department);
  }
  if (filters?.year) {
    students = students.filter(s => s.year === Number(filters.year));
  }
  if (filters?.section) {
    students = students.filter(s => s.section === filters.section);
  }
  if (filters?.query) {
    const q = filters.query.toLowerCase().trim();
    students = students.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        s.parentName.toLowerCase().includes(q)
    );
  }

  // Enforce phone masking strictly
  return students.map(s => ({
    ...s,
    parentPhone: maskPhoneNumber(s.parentPhone),
  }));
}

export async function getStudent(id: number): Promise<Student | null> {
  initStorage();
  const students = load<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  const s = students.find(item => item.id === id);
  if (!s) return null;
  return {
    ...s,
    parentPhone: maskPhoneNumber(s.parentPhone),
  };
}

export async function archiveStudent(id: number): Promise<void> {
  const students = load<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  const updated = students.map(s =>
    s.id === id ? { ...s, isActive: false, archivedAt: new Date().toISOString() } : s
  );
  save(STORAGE_KEYS.STUDENTS, updated);
  await logActivity('structure_change', `Archived student id ${id}`);
}

export async function restoreStudent(id: number): Promise<void> {
  const students = load<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  const updated = students.map(s =>
    s.id === id ? { ...s, isActive: true, archivedAt: null } : s
  );
  save(STORAGE_KEYS.STUDENTS, updated);
  await logActivity('structure_change', `Restored student id ${id}`);
}

// Uploads
export async function listUploads(filters?: {
  department?: string;
  year?: number;
  section?: string;
}): Promise<UploadRecord[]> {
  initStorage();
  let uploads = load<UploadRecord[]>(STORAGE_KEYS.UPLOADS, INITIAL_UPLOADS);
  if (filters?.department) uploads = uploads.filter(u => u.department === filters.department);
  if (filters?.year) uploads = uploads.filter(u => u.year === Number(filters.year));
  if (filters?.section) uploads = uploads.filter(u => u.section === filters.section);
  return uploads;
}

export async function checkDuplicateUpload(
  department: string,
  year: number,
  section: string,
  uploadDate: string
): Promise<UploadRecord | null> {
  initStorage();
  const uploads = load<UploadRecord[]>(STORAGE_KEYS.UPLOADS, INITIAL_UPLOADS);
  const existing = uploads.find(
    u =>
      u.department === department &&
      u.year === year &&
      u.section === section &&
      u.uploadDate === uploadDate &&
      u.status === 'active'
  );
  return existing || null;
}

export async function saveUpload(
  upload: Omit<UploadRecord, 'id' | 'createdAt'>,
  parsedStudents?: Student[]
): Promise<UploadRecord> {
  initStorage();
  const uploads = load<UploadRecord[]>(STORAGE_KEYS.UPLOADS, INITIAL_UPLOADS);
  
  // If replacing existing upload for same class and date, mark old as superseded
  let nextVersion = 1;
  const existing = uploads.find(
    u =>
      u.department === upload.department &&
      u.year === upload.year &&
      u.section === upload.section &&
      u.uploadDate === upload.uploadDate &&
      u.status === 'active'
  );

  const newId = uploads.length > 0 ? Math.max(...uploads.map(u => u.id)) + 1 : 1;
  if (existing) {
    existing.status = 'superseded';
    existing.replacedBy = newId;
    nextVersion = existing.version + 1;
  }

  const newRecord: UploadRecord = {
    ...upload,
    id: newId,
    version: nextVersion,
    createdAt: new Date().toISOString(),
  };

  uploads.push(newRecord);
  save(STORAGE_KEYS.UPLOADS, uploads);

  // If students provided, merge into student database
  if (parsedStudents && parsedStudents.length > 0) {
    const currentStudents = load<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    let nextStudentId = currentStudents.length > 0 ? Math.max(...currentStudents.map(s => s.id)) + 1 : 1;

    for (const newS of parsedStudents) {
      const idx = currentStudents.findIndex(s => s.rollNumber === newS.rollNumber);
      if (idx >= 0) {
        currentStudents[idx] = {
          ...currentStudents[idx],
          name: newS.name,
          parentName: newS.parentName,
          parentPhone: maskPhoneNumber(newS.parentPhone),
          attendanceStatus: newS.attendanceStatus,
          marks: newS.marks,
          residenceType: newS.residenceType,
          busRoute: newS.busRoute,
          isActive: true,
        };
      } else {
        currentStudents.push({
          ...newS,
          id: nextStudentId++,
          parentPhone: maskPhoneNumber(newS.parentPhone),
          isActive: true,
        });
      }
    }
    save(STORAGE_KEYS.STUDENTS, currentStudents);
  }

  await logActivity('upload', `Uploaded ${newRecord.fileName} version ${newRecord.version}`);
  return newRecord;
}

// Campaigns
export async function listCampaigns(filters?: {
  role?: UserRole;
  department?: string;
  status?: CampaignStatus;
}): Promise<Campaign[]> {
  initStorage();
  let campaigns = load<Campaign[]>(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  if (filters?.role === 'faculty' && filters?.department) {
    campaigns = campaigns.filter(c => c.department === filters.department);
  }
  if (filters?.status) {
    campaigns = campaigns.filter(c => c.status === filters.status);
  }
  return campaigns;
}

export async function getCampaign(id: number): Promise<Campaign | null> {
  initStorage();
  const campaigns = load<Campaign[]>(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  return campaigns.find(c => c.id === id) || null;
}

export async function saveDraftCampaign(draft: Partial<Campaign>): Promise<Campaign> {
  initStorage();
  const campaigns = load<Campaign[]>(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  const activeUser = await getActiveUser();

  if (draft.id) {
    const idx = campaigns.findIndex(c => c.id === draft.id);
    if (idx >= 0) {
      campaigns[idx] = { ...campaigns[idx], ...draft } as Campaign;
      save(STORAGE_KEYS.CAMPAIGNS, campaigns);
      return campaigns[idx];
    }
  }

  const newId = campaigns.length > 0 ? Math.max(...campaigns.map(c => c.id)) + 1 : 1;
  const newCampaign: Campaign = {
    id: newId,
    title: draft.title || `${draft.department}-${draft.year}${draft.section} Campaign`,
    module: draft.module || 'mentoring',
    department: draft.department || 'CSE',
    year: draft.year || 3,
    section: draft.section || 'Section A',
    attendanceDate: draft.attendanceDate || new Date().toISOString().split('T')[0],
    uploadId: draft.uploadId || 1,
    uploadVersion: draft.uploadVersion || 1,
    status: draft.status || 'draft',
    createdBy: activeUser.fullName,
    createdByRole: activeUser.role,
    assignedFaculty: activeUser.role === 'faculty' ? activeUser.fullName : undefined,
    totalTargetCalls: draft.totalTargetCalls || 0,
    completedCalls: 0,
    pendingCalls: draft.totalTargetCalls || 0,
    failedCalls: 0,
    questionsConfig: draft.questionsConfig || {
      language: 'Telugu',
      voiceOption: 'Ananya (Friendly Telugu Female)',
      purpose: 'Standard Attendance Verification',
      scriptText: 'నమస్కారం, విజ్ఞాన్ ఐఐటి నుండి కాల్.',
      feedbackTopics: { college: false, hostel: false, transport: false },
      callingHoursStart: '09:00',
      callingHoursEnd: '18:00',
      maxRetries: 2,
      maxDurationSeconds: 120,
    },
    createdAt: new Date().toISOString(),
  };

  campaigns.push(newCampaign);
  save(STORAGE_KEYS.CAMPAIGNS, campaigns);
  await logActivity('campaign_created', `Draft campaign #${newId} saved`);
  return newCampaign;
}

export async function discardDraftCampaign(campaignId: number): Promise<void> {
  initStorage();
  const campaigns = load<Campaign[]>(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  const target = campaigns.find(c => c.id === campaignId);
  if (!target) throw new Error('Campaign not found');
  if (target.status !== 'draft') {
    throw new Error('Only unsubmitted draft campaigns can be discarded.');
  }
  const filtered = campaigns.filter(c => c.id !== campaignId);
  save(STORAGE_KEYS.CAMPAIGNS, filtered);
  await logActivity('campaign_created', `Discarded unsent draft campaign #${campaignId}`);
}

export async function submitToAdmin(campaignId: number): Promise<Campaign> {
  const campaigns = load<Campaign[]>(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  const campaign = campaigns.find(c => c.id === campaignId);
  if (!campaign) throw new Error('Campaign not found');

  campaign.status = 'pending_approval';
  save(STORAGE_KEYS.CAMPAIGNS, campaigns);
  await logActivity('campaign_submitted', `Faculty submitted campaign #${campaignId} for Admin approval`);
  return campaign;
}

export async function approveCampaign(campaignId: number): Promise<Campaign> {
  const campaigns = load<Campaign[]>(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  const campaign = campaigns.find(c => c.id === campaignId);
  if (!campaign) throw new Error('Campaign not found');

  campaign.status = 'confirmed';
  save(STORAGE_KEYS.CAMPAIGNS, campaigns);
  await logActivity('campaign_started', `Admin approved campaign #${campaignId}`);
  return campaign;
}

export async function returnCampaignWithNote(campaignId: number, note: string): Promise<Campaign> {
  const campaigns = load<Campaign[]>(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  const campaign = campaigns.find(c => c.id === campaignId);
  if (!campaign) throw new Error('Campaign not found');

  campaign.status = 'draft';
  campaign.adminNote = note;
  save(STORAGE_KEYS.CAMPAIGNS, campaigns);
  await logActivity('campaign_submitted', `Admin returned campaign #${campaignId} with note: ${note}`);
  return campaign;
}

export async function confirmCampaign(campaignId: number): Promise<Campaign> {
  const campaigns = load<Campaign[]>(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  const campaign = campaigns.find(c => c.id === campaignId);
  if (!campaign) throw new Error('Campaign not found');

  campaign.status = 'in_progress';
  campaign.startedAt = new Date().toISOString();
  save(STORAGE_KEYS.CAMPAIGNS, campaigns);
  await logActivity('campaign_started', `Campaign #${campaignId} started`);
  return campaign;
}

export async function controlCampaign(
  campaignId: number,
  action: 'pause' | 'resume' | 'stop'
): Promise<Campaign> {
  const campaigns = load<Campaign[]>(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  const campaign = campaigns.find(c => c.id === campaignId);
  if (!campaign) throw new Error('Campaign not found');

  if (action === 'pause') {
    campaign.status = 'paused';
    await logActivity('campaign_paused', `Campaign #${campaignId} paused by Admin`);
  } else if (action === 'resume') {
    campaign.status = 'in_progress';
    await logActivity('campaign_started', `Campaign #${campaignId} resumed by Admin`);
  } else if (action === 'stop') {
    campaign.status = 'completed';
    campaign.completedAt = new Date().toISOString();
    await logActivity('campaign_stopped', `Campaign #${campaignId} stopped by Admin`);
  }

  save(STORAGE_KEYS.CAMPAIGNS, campaigns);
  return campaign;
}

// Call Records
export async function listCallHistory(filters?: {
  campaignId?: number;
  department?: string;
  status?: CallStatus;
  query?: string;
}): Promise<CallRecord[]> {
  initStorage();
  let calls = load<CallRecord[]>(STORAGE_KEYS.CALLS, INITIAL_CALL_RECORDS);

  if (filters?.campaignId) {
    calls = calls.filter(c => c.campaignId === filters.campaignId);
  }
  if (filters?.status) {
    calls = calls.filter(c => c.status === filters.status);
  }
  if (filters?.query) {
    const q = filters.query.toLowerCase().trim();
    calls = calls.filter(
      c =>
        c.studentName.toLowerCase().includes(q) ||
        c.rollNumber.toLowerCase().includes(q) ||
        c.parentName.toLowerCase().includes(q)
    );
  }

  return calls.map(c => ({
    ...c,
    maskedPhone: maskPhoneNumber(c.maskedPhone),
  }));
}

export async function getCallRecord(id: number): Promise<CallRecord | null> {
  initStorage();
  const calls = load<CallRecord[]>(STORAGE_KEYS.CALLS, INITIAL_CALL_RECORDS);
  const c = calls.find(item => item.id === id);
  if (!c) return null;
  return {
    ...c,
    maskedPhone: maskPhoneNumber(c.maskedPhone),
  };
}

// Issues (Orange Loop)
export async function listIssues(filters?: {
  role?: UserRole;
  category?: IssueCategory;
  status?: IssueStatus;
}): Promise<Issue[]> {
  initStorage();
  let issues = load<Issue[]>(STORAGE_KEYS.ISSUES, INITIAL_ISSUES);

  if (filters?.role === 'college_coordinator') {
    issues = issues.filter(i => i.category === 'College');
  } else if (filters?.role === 'hostel_dean') {
    issues = issues.filter(i => i.category === 'Hostel');
  } else if (filters?.role === 'bus_correspondent') {
    issues = issues.filter(i => i.category === 'Bus');
  }

  if (filters?.category) {
    issues = issues.filter(i => i.category === filters.category);
  }
  if (filters?.status) {
    issues = issues.filter(i => i.status === filters.status);
  }

  return issues;
}

export async function getIssue(id: number): Promise<Issue | null> {
  initStorage();
  const issues = load<Issue[]>(STORAGE_KEYS.ISSUES, INITIAL_ISSUES);
  return issues.find(i => i.id === id) || null;
}

export async function updateIssueStatus(
  issueId: number,
  newStatus: IssueStatus,
  comment: string,
  performedBy: string,
  resolutionNotes?: string
): Promise<Issue> {
  const issues = load<Issue[]>(STORAGE_KEYS.ISSUES, INITIAL_ISSUES);
  const issue = issues.find(i => i.id === issueId);
  if (!issue) throw new Error('Issue not found');

  const oldStatus = issue.status;
  issue.status = newStatus;
  issue.updatedAt = new Date().toISOString();
  if (resolutionNotes) issue.resolutionNotes = resolutionNotes;

  const nextTimelineId =
    issue.timeline.length > 0 ? Math.max(...issue.timeline.map(t => t.id)) + 1 : 1;

  issue.timeline.push({
    id: nextTimelineId,
    issueId,
    statusFrom: oldStatus,
    statusTo: newStatus,
    performedBy,
    comment,
    timestamp: new Date().toISOString(),
  });

  save(STORAGE_KEYS.ISSUES, issues);
  await logActivity('issue_updated', `Issue #${issueId} transitioned from ${oldStatus} to ${newStatus}`);
  return issue;
}

export async function runConfirmationCall(
  issueId: number,
  simulatedResponse: 'Yes' | 'No'
): Promise<Issue> {
  const issues = load<Issue[]>(STORAGE_KEYS.ISSUES, INITIAL_ISSUES);
  const issue = issues.find(i => i.id === issueId);
  if (!issue) throw new Error('Issue not found');

  const oldStatus = issue.status;
  const nextTimelineId =
    issue.timeline.length > 0 ? Math.max(...issue.timeline.map(t => t.id)) + 1 : 1;

  if (simulatedResponse === 'Yes') {
    issue.status = 'closed';
    issue.timeline.push({
      id: nextTimelineId,
      issueId,
      statusFrom: oldStatus,
      statusTo: 'closed',
      performedBy: 'Parent Confirmation Call',
      comment: 'Parent confirmed issue is fully resolved. Ticket closed.',
      timestamp: new Date().toISOString(),
    });
    await logActivity('confirmation_call', `Issue #${issueId} parent verified resolved -> Closed`);
  } else {
    issue.status = 'reopened';
    issue.reopenCount += 1;
    if (issue.reopenCount >= 3) {
      issue.isCritical = true;
    }
    issue.timeline.push({
      id: nextTimelineId,
      issueId,
      statusFrom: oldStatus,
      statusTo: 'reopened',
      performedBy: 'Parent Confirmation Call',
      comment: `Parent reported issue persists (Reopen #${issue.reopenCount}${issue.isCritical ? ' - Critical flag set' : ''}).`,
      timestamp: new Date().toISOString(),
    });
    await logActivity('confirmation_call', `Issue #${issueId} verification failed -> Reopened #${issue.reopenCount}`);
  }

  issue.updatedAt = new Date().toISOString();
  save(STORAGE_KEYS.ISSUES, issues);
  return issue;
}

// Academic Structure & Users (Admin Only)
export async function getClassStructure(): Promise<{
  departments: Department[];
  years: AcademicYear[];
  sections: Section[];
}> {
  initStorage();
  return {
    departments: load<Department[]>(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS),
    years: load<AcademicYear[]>(STORAGE_KEYS.YEARS, INITIAL_YEARS),
    sections: load<Section[]>(STORAGE_KEYS.SECTIONS, INITIAL_SECTIONS),
  };
}

export async function saveClassStructure(
  departments: Department[],
  years: AcademicYear[],
  sections: Section[]
): Promise<void> {
  save(STORAGE_KEYS.DEPARTMENTS, departments);
  save(STORAGE_KEYS.YEARS, years);
  save(STORAGE_KEYS.SECTIONS, sections);
  await logActivity('structure_change', 'Updated academic class structure');
}

export async function listUsers(): Promise<User[]> {
  initStorage();
  return load<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
}

export async function createUser(user: Omit<User, 'id'>): Promise<User> {
  const users = load<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
  const newUser: User = { ...user, id: newId };
  users.push(newUser);
  save(STORAGE_KEYS.USERS, users);
  await logActivity('structure_change', `Created user ${newUser.username} (${newUser.role})`);
  return newUser;
}

export async function updateUser(id: number, data: Partial<User>): Promise<User> {
  const users = load<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  const idx = users.findIndex(u => u.id === id);
  if (idx < 0) throw new Error('User not found');
  users[idx] = { ...users[idx], ...data };
  save(STORAGE_KEYS.USERS, users);
  await logActivity('user_assignment', `Updated user ${users[idx].username}`);
  return users[idx];
}

// Settings
export async function getSettings(): Promise<SystemSettings> {
  initStorage();
  return load<SystemSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
}

export async function saveSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  const current = load<SystemSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  const updated = { ...current, ...settings };
  save(STORAGE_KEYS.SETTINGS, updated);
  await logActivity('settings_update', 'Updated system preferences');
  return updated;
}

// Activity Log
export async function listActivityLog(filters?: {
  actionType?: string;
  userRole?: string;
}): Promise<ActivityLogEntry[]> {
  initStorage();
  let logs = load<ActivityLogEntry[]>(STORAGE_KEYS.ACTIVITY_LOG, INITIAL_ACTIVITY_LOG);
  if (filters?.actionType) {
    logs = logs.filter(l => l.actionType === filters.actionType);
  }
  if (filters?.userRole) {
    logs = logs.filter(l => l.userRole === filters.userRole);
  }
  return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

async function logActivity(
  actionType: ActivityLogEntry['actionType'],
  details: string
): Promise<void> {
  const logs = load<ActivityLogEntry[]>(STORAGE_KEYS.ACTIVITY_LOG, INITIAL_ACTIVITY_LOG);
  const activeUser = await getActiveUser();
  const nextId = logs.length > 0 ? Math.max(...logs.map(l => l.id)) + 1 : 1;
  logs.push({
    id: nextId,
    actionType,
    userName: activeUser.fullName || activeUser.username,
    userRole: activeUser.role,
    targetEntity: 'System',
    details,
    timestamp: new Date().toISOString(),
  });
  save(STORAGE_KEYS.ACTIVITY_LOG, logs);
}

// Report Export (.xlsx generation in browser with SheetJS)
export async function exportReport(
  type: 'campaigns' | 'calls' | 'issues',
  role: UserRole
): Promise<string> {
  await logActivity('report_export', `Exported ${type} report as Excel`);
  return `Exported ${type} with strictly masked parent phone numbers.`;
}

