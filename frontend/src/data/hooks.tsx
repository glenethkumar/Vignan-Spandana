import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  Campaign,
  Student,
  CallRecord,
  Issue,
  Department,
  AcademicYear,
  Section,
  CampaignStatus,
} from './types';
import {
  initStorage,
  getActiveUser,
  setActiveUser,
  listCampaigns,
  saveDraftCampaign,
  discardDraftCampaign,
  confirmCampaign,
  controlCampaign,
  listStudents,
  listCallHistory,
  listIssues,
  updateIssueStatus,
  runConfirmationCall,
  getClassStructure,
} from './api';
import { INITIAL_USERS } from './initialData';

export const DEMO_USERS = INITIAL_USERS;

// ==========================================
// AUTH HOOK & CONTEXT
// ==========================================
interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchUser: (user: User) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initStorage();
    getActiveUser().then((user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });
  }, []);

  const login = async (identifier: string, _password?: string): Promise<boolean> => {
    const term = identifier.trim().toLowerCase();
    const matched = DEMO_USERS.find(
      (u) =>
        u.email.toLowerCase() === term ||
        u.username.toLowerCase() === term ||
        (term.startsWith('faculty') && u.role === 'faculty')
    );
    if (matched) {
      await setActiveUser(matched);
      setCurrentUser(matched);
      return true;
    }
    // Generic fallback for demo
    const defaultAdmin = DEMO_USERS[0];
    await setActiveUser(defaultAdmin);
    setCurrentUser(defaultAdmin);
    return true;
  };

  const logout = () => {
    localStorage.removeItem('viit_active_user');
    setCurrentUser(null);
  };

  const switchUser = async (user: User) => {
    await setActiveUser(user);
    setCurrentUser(user);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, switchUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// ==========================================
// CAMPAIGNS HOOK
// ==========================================
export const useCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [draftCampaign, setDraftCampaign] = useState<Partial<Campaign> | null>(null);

  const load = useCallback(async () => {
    const list = await listCampaigns();
    setCampaigns(list);
    const draft = list.find((c) => c.status === 'draft');
    if (draft) setDraftCampaign(draft);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveDraft = useCallback(async (draft: Partial<Campaign>) => {
    setDraftCampaign(draft);
    await saveDraftCampaign(draft);
  }, []);

  const clearDraft = useCallback(async () => {
    if (draftCampaign?.id) {
      await discardDraftCampaign(draftCampaign.id);
    }
    setDraftCampaign(null);
    load();
  }, [draftCampaign, load]);

  const createCampaign = async (payload: Partial<Campaign>): Promise<number> => {
    const saved = await saveDraftCampaign(payload);
    if (payload.status === 'confirmed' || payload.status === 'in_progress') {
      await confirmCampaign(saved.id);
    }
    await load();
    return saved.id;
  };

  const updateCampaignStatus = async (id: number, status: CampaignStatus) => {
    if (status === 'in_progress') {
      await controlCampaign(id, 'resume');
    } else if (status === 'paused') {
      await controlCampaign(id, 'pause');
    } else if (status === 'completed') {
      await controlCampaign(id, 'stop');
    }
    await load();
  };

  return {
    campaigns,
    draftCampaign,
    loadCampaigns: load,
    saveDraft,
    clearDraft,
    createCampaign,
    updateCampaignStatus,
  };
};

// ==========================================
// STUDENTS HOOK
// ==========================================
export const useStudents = () => {
  const [students, setStudents] = useState<Student[]>([]);

  const load = useCallback(async () => {
    const list = await listStudents();
    setStudents(list);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addStudents = async (newStudents: Student[]) => {
    const current = await listStudents();
    const updated = [...current, ...newStudents];
    localStorage.setItem('viit_students', JSON.stringify(updated));
    setStudents(updated);
  };

  return { students, loadStudents: load, addStudents };
};

// ==========================================
// ISSUES HOOK
// ==========================================
export const useIssues = () => {
  const [issues, setIssues] = useState<Issue[]>([]);

  const load = useCallback(async () => {
    const list = await listIssues();
    setIssues(list);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolveIssue = async (id: number, resolutionNotes: string) => {
    await updateIssueStatus(id, 'resolved', 'Resolution notes recorded', 'Staff User', resolutionNotes);
    await load();
  };

  const confirmIssueResolution = async (id: number, confirmed: boolean) => {
    await runConfirmationCall(id, confirmed ? 'Yes' : 'No');
    await load();
  };

  const openIssuesCount = issues.filter(
    (i) => i.status === 'open' || i.status === 'in_progress'
  ).length;

  return {
    issues,
    openIssuesCount,
    resolveIssue,
    confirmIssueResolution,
    loadIssues: load,
  };
};

// ==========================================
// CALL RECORDS HOOK
// ==========================================
export const useCallRecords = () => {
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);

  const load = useCallback(async () => {
    const list = await listCallHistory();
    setCallRecords(list);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { callRecords, loadRecords: load };
};

// ==========================================
// CLASSES HOOK
// ==========================================
export const useClasses = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    getClassStructure().then((structure) => {
      setDepartments(structure.departments);
      setYears(structure.years);
      setSections(structure.sections);
    });
  }, []);

  return {
    departments,
    classes: { years, sections },
  };
};
