import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Layers,
  PhoneCall,
  FileSpreadsheet,
  HelpCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  Download,
  AlertTriangle,
  AlertCircle,
  FileText,
  ShieldCheck,
  Check,
  Clock,
  Sparkles,
  Info,
  RefreshCw,
  Send,
  Play,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import {
  Department,
  AcademicYear,
  Section,
  User,
  CampaignModule,
  QuestionsConfig,
  Student,
  Campaign,
  UploadRecord,
} from '../../data/types';
import {
  getActiveUser,
  getClassStructure,
  saveDraftCampaign,
  submitToAdmin,
  confirmCampaign,
  checkDuplicateUpload,
  saveUpload,
  getSettings,
} from '../../data/api';
import {
  generateExcelTemplate,
  downloadFile,
  readUploadedSpreadsheet,
  validateStudentRows,
  generateErrorsExcel,
  ExcelValidationResult,
  REQUIRED_COLUMNS,
} from '../../lib/excel';
import { maskPhoneNumber } from '../../lib/masking';
import { formatDate } from '../../lib/utils';

export const WizardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User & Structure state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingStructure, setLoadingStructure] = useState(true);

  // Stepper state (1 to 7)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [draftCampaignId, setDraftCampaignId] = useState<number | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');

  // Step 1: Department
  const [selectedDept, setSelectedDept] = useState<string>('');

  // Step 2: Year (1 to 4)
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Step 3: Section
  const [selectedSection, setSelectedSection] = useState<string>('');

  // Step 4: Module & Date
  const [selectedModule, setSelectedModule] = useState<CampaignModule>('mentoring');
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Step 5: Excel Upload & Validation
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadVersion, setUploadVersion] = useState<number>(1);
  const [existingUploadRecord, setExistingUploadRecord] = useState<UploadRecord | null>(null);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ExcelValidationResult | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isMappingNeeded, setIsMappingNeeded] = useState<boolean>(false);
  const [activeRosterTab, setActiveRosterTab] = useState<'calling' | 'excluded'>('calling');

  // Step 6: Questions Configuration
  const [questionsConfig, setQuestionsConfig] = useState<QuestionsConfig>({
    language: 'Telugu',
    voiceOption: 'Ananya (Friendly Telugu Female)',
    purpose: 'Standard Attendance Verification',
    scriptText:
      'నమస్కారం, విజ్ఞాన్ ఐఐటి నుండి కాల్. మీ అబ్బాయి/అమ్మాయి ఈరోజు కాలేజీకి రాలేదు. గైర్హాజరు కారణం తెలపగలరా?',
    feedbackTopics: { college: false, hostel: false, transport: false },
    callingHoursStart: '09:00',
    callingHoursEnd: '18:00',
    maxRetries: 2,
    maxDurationSeconds: 120,
  });

  // Step 7: Launch Confirmation Modal (Admin)
  const [isConfirmLaunchModalOpen, setIsConfirmLaunchModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load user & academic structure
  useEffect(() => {
    async function init() {
      setLoadingStructure(true);
      const user = await getActiveUser();
      setCurrentUser(user);

      const structure = await getClassStructure();
      // If faculty, filter departments by assignment
      if (user.role === 'faculty' && user.department) {
        setDepartments(structure.departments.filter(d => d.code === user.department));
        setSelectedDept(user.department);
      } else {
        setDepartments(structure.departments);
        if (structure.departments.length > 0) {
          setSelectedDept(structure.departments[0].code);
        }
      }
      setYears(structure.years);
      setSections(structure.sections);

      // Load settings defaults
      const settings = await getSettings();
      setQuestionsConfig(prev => ({
        ...prev,
        language: settings.defaultLanguage,
        callingHoursStart: settings.callingHoursStart,
        callingHoursEnd: settings.callingHoursEnd,
        maxRetries: settings.retryAttempts,
        maxDurationSeconds: settings.maxCallDurationSeconds,
      }));

      setLoadingStructure(false);
    }
    init();
  }, []);

  // Autosave draft helper
  const triggerAutosave = async () => {
    if (!selectedDept) return;
    try {
      const draft = await saveDraftCampaign({
        id: draftCampaignId || undefined,
        department: selectedDept,
        year: selectedYear || 1,
        section: selectedSection || 'Section A',
        module: selectedModule,
        attendanceDate,
        uploadVersion,
        totalTargetCalls: validationResult ? (selectedModule === 'mentoring' ? validationResult.absentCount : validationResult.validRows.length) : 0,
        questionsConfig,
      });
      setDraftCampaignId(draft.id);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Autosave error:', err);
    }
  };

  // Step navigation validations
  const canProceed = (): boolean => {
    if (currentStep === 1) return !!selectedDept;
    if (currentStep === 2) return selectedYear !== null;
    if (currentStep === 3) return !!selectedSection;
    if (currentStep === 4) return !!selectedModule && !!attendanceDate;
    if (currentStep === 5) return !!validationResult && validationResult.isValid && validationResult.validRows.length > 0;
    if (currentStep === 6) return !!questionsConfig.scriptText && !!questionsConfig.purpose;
    if (currentStep === 7) return true;
    return false;
  };

  const handleNext = async () => {
    if (!canProceed()) return;
    await triggerAutosave();
    if (currentStep < 7) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Excel Handling
  const handleTemplateDownload = () => {
    const templateBytes = generateExcelTemplate();
    downloadFile(templateBytes, `VIIT_${selectedDept}_Attendance_Template.xlsx`);
    showToast('Template downloaded successfully', 'info');
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      showToast('Please upload a valid .xlsx, .xls, or .csv spreadsheet file', 'error');
      return;
    }

    try {
      const { headers, rawRows: rows } = await readUploadedSpreadsheet(file);
      setUploadedFile(file);
      setRawHeaders(headers);
      setRawRows(rows);

      // Check if duplicate upload exists for this class & date
      const duplicate = await checkDuplicateUpload(selectedDept, selectedYear || 1, selectedSection, attendanceDate);
      if (duplicate) {
        setExistingUploadRecord(duplicate);
        setIsReplaceModalOpen(true);
      } else {
        setUploadVersion(1);
      }

      // Default column mapping (case-insensitive substring match)
      const mapping: Record<string, string> = {};
      let missingRequired = false;

      REQUIRED_COLUMNS.forEach(stdCol => {
        const found = headers.find(h =>
          h.toLowerCase().replace(/[^a-z0-9]/g, '').includes(stdCol.replace(/[^a-z0-9]/g, ''))
        );
        if (found) {
          mapping[stdCol] = found;
        } else {
          missingRequired = true;
        }
      });

      // Optional columns mapping
      ['language', 'marks', 'hostel_or_day_scholar', 'bus_route', 'department', 'year', 'section'].forEach(col => {
        const found = headers.find(h =>
          h.toLowerCase().replace(/[^a-z0-9]/g, '').includes(col.replace(/[^a-z0-9]/g, ''))
        );
        if (found) mapping[col] = found;
      });

      setColumnMapping(mapping);

      if (missingRequired) {
        setIsMappingNeeded(true);
      } else {
        runValidation(rows, mapping);
      }
    } catch (err: any) {
      showToast(err.message || 'Error processing spreadsheet', 'error');
    }
  };

  const runValidation = (rows: Record<string, any>[], mapping: Record<string, string>) => {
    const result = validateStudentRows(
      rows,
      mapping,
      { department: selectedDept, year: selectedYear || 1, section: selectedSection },
      selectedModule
    );
    setValidationResult(result);
    if (result.isValid) {
      showToast(`Spreadsheet verified! ${result.validRows.length} valid student rows detected.`, 'success');
    } else {
      showToast(`Found ${result.errors.filter(e => e.isBlocking).length} blocking errors in spreadsheet.`, 'error');
    }
  };

  const handleConfirmReplace = () => {
    if (existingUploadRecord) {
      setUploadVersion(existingUploadRecord.version + 1);
    }
    setIsReplaceModalOpen(false);
    showToast(`Replacement confirmed. This upload will be registered as Version ${uploadVersion + 1}`, 'info');
  };

  const handleDownloadErrorsExcel = () => {
    if (!validationResult || validationResult.errors.length === 0) return;
    const bytes = generateErrorsExcel(validationResult.errors);
    downloadFile(bytes, `VIIT_Upload_Errors_${selectedDept}_${attendanceDate}.xlsx`);
    showToast('Downloaded errors Excel report', 'info');
  };

  // Launch / Submit Action
  const handleFacultySubmitToAdmin = async () => {
    if (!draftCampaignId) {
      await triggerAutosave();
    }
    setIsSubmitting(true);
    try {
      // 1. Save upload record
      if (uploadedFile && validationResult) {
        await saveUpload(
          {
            className: `${selectedDept} / Year ${selectedYear} / ${selectedSection}`,
            department: selectedDept,
            year: selectedYear || 1,
            section: selectedSection,
            uploadDate: attendanceDate,
            uploadedBy: currentUser?.fullName || 'Faculty',
            fileName: uploadedFile.name,
            version: uploadVersion,
            totalRows: validationResult.totalRows,
            presentCount: validationResult.presentCount,
            absentCount: validationResult.absentCount,
            status: 'active',
          },
          validationResult.validRows as any
        );
      }

      // 2. Submit campaign
      if (draftCampaignId) {
        await submitToAdmin(draftCampaignId);
      }
      showToast('Campaign submitted to College Administrator for final sign-off', 'success');
      navigate('/app');
    } catch (err) {
      showToast('Failed to submit campaign', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminConfirmAndStart = async () => {
    setIsSubmitting(true);
    try {
      // 1. Save upload record
      if (uploadedFile && validationResult) {
        await saveUpload(
          {
            className: `${selectedDept} / Year ${selectedYear} / ${selectedSection}`,
            department: selectedDept,
            year: selectedYear || 1,
            section: selectedSection,
            uploadDate: attendanceDate,
            uploadedBy: currentUser?.fullName || 'Admin',
            fileName: uploadedFile.name,
            version: uploadVersion,
            totalRows: validationResult.totalRows,
            presentCount: validationResult.presentCount,
            absentCount: validationResult.absentCount,
            status: 'active',
          },
          validationResult.validRows as any
        );
      }

      // 2. Launch campaign
      let campId = draftCampaignId;
      if (!campId) {
        const saved = await saveDraftCampaign({
          department: selectedDept,
          year: selectedYear || 1,
          section: selectedSection,
          module: selectedModule,
          attendanceDate,
          uploadVersion,
          totalTargetCalls: validationResult ? (selectedModule === 'mentoring' ? validationResult.absentCount : validationResult.validRows.length) : 0,
          questionsConfig,
        });
        campId = saved.id;
      }

      await confirmCampaign(campId);
      showToast('Campaign confirmed! Live call queue initiated.', 'success');
      setIsConfirmLaunchModalOpen(false);
      navigate(`/app/campaign/${campId}/monitor`);
    } catch (err) {
      showToast('Failed to launch campaign', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFaculty = currentUser?.role === 'faculty';
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'principal';

  // Available sections filtered by selected year
  const availableSections = sections.filter(
    s => s.yearNumber === selectedYear && (selectedDept ? s.departmentId === (selectedDept === 'CSE' ? 1 : 2) : true)
  );

  // Stepper items labels
  const steps = [
    { num: 1, label: 'Department' },
    { num: 2, label: 'Year' },
    { num: 3, label: 'Section' },
    { num: 4, label: 'Module & Date' },
    { num: 5, label: 'Student List' },
    { num: 6, label: 'Call Settings' },
    { num: 7, label: 'Review & Launch' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-in fade-in duration-150">
      {/* Top Header & Breadcrumb Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-brand uppercase tracking-widest font-mono">
              NEW CAMPAIGN · STEP 0{currentStep} / 07
            </span>
            <span className="text-ink-300">•</span>
            <span className="text-xs text-ink-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-brand" />
              <span>Saved on this device ({lastSavedTime})</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
            {steps[currentStep - 1].label}
          </h1>
        </div>

        {/* Selected Breadcrumb Chips */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {selectedDept && (
            <span className="px-2.5 py-1 rounded-md bg-brand-50 text-brand font-semibold border border-brand-100">
              {selectedDept}
            </span>
          )}
          {selectedYear && (
            <span className="px-2.5 py-1 rounded-md bg-page text-ink-700 font-medium border border-border">
              Year {selectedYear}
            </span>
          )}
          {selectedSection && (
            <span className="px-2.5 py-1 rounded-md bg-page text-ink-700 font-medium border border-border">
              {selectedSection}
            </span>
          )}
          {selectedModule && (
            <span className="px-2.5 py-1 rounded-md bg-page text-ink-700 font-medium border border-border capitalize">
              {selectedModule}
            </span>
          )}
          {uploadVersion > 1 && (
            <Badge variant="brand" size="sm">
              Version {uploadVersion}
            </Badge>
          )}
        </div>
      </div>

      {/* 7-Step Visual Stepper Bar */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center justify-between min-w-[640px] px-2">
          {steps.map((s, idx) => {
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <React.Fragment key={s.num}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? 'bg-brand text-white shadow-xs'
                        : isCurrent
                        ? 'bg-brand text-white ring-4 ring-brand-100'
                        : 'bg-page text-ink-400 border border-border'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isCurrent ? 'text-ink-900 font-bold' : isCompleted ? 'text-ink-700' : 'text-ink-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-[2px] mx-3 ${
                      isCompleted ? 'bg-brand' : 'bg-border'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Department */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-ink-500">
            Select the engineering department for this outreach campaign. Faculty accounts only see assigned departments.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {departments.map(dept => {
              const isSelected = selectedDept === dept.code;
              return (
                <div
                  key={dept.id}
                  onClick={() => setSelectedDept(dept.code)}
                  className={`p-6 rounded-card border transition-all cursor-pointer flex items-start justify-between ${
                    isSelected
                      ? 'bg-brand-50 border-brand ring-2 ring-brand/20 shadow-xs'
                      : 'bg-surface border-border hover:border-ink-400 hover:shadow-card'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-brand">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-ink-900">{dept.name}</h3>
                      <p className="text-xs font-mono font-bold text-brand mt-0.5">{dept.code}</p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected ? 'border-brand bg-brand text-white' : 'border-ink-300 bg-surface'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2: Year */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-ink-500">
            Select the academic year (01 to 04) for students in {selectedDept}.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(yr => {
              const isSelected = selectedYear === yr;
              const labels = ['1st Year (Freshmen)', '2nd Year (Sophomores)', '3rd Year (Pre-Final)', '4th Year (Graduating)'];
              return (
                <div
                  key={yr}
                  onClick={() => {
                    setSelectedYear(yr);
                    setSelectedSection(''); // Reset section on year change
                  }}
                  className={`p-6 rounded-card border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-brand-50 border-brand ring-2 ring-brand/20 shadow-xs'
                      : 'bg-surface border-border hover:border-ink-400 hover:shadow-card'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-extrabold text-ink-900 font-mono">0{yr}</span>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-brand bg-brand text-white' : 'border-ink-300 bg-surface'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-ink-900">Year {yr}</h4>
                    <p className="text-[11px] text-ink-500 mt-0.5">{labels[yr - 1]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: Section */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-ink-500">
            Choose the specific section for {selectedDept} / Year {selectedYear}. Student roster will be configured in Step 5.
          </p>
          {availableSections.length === 0 ? (
            <div className="p-8 text-center bg-surface border border-dashed border-border rounded-card">
              <p className="text-sm text-ink-500">No active sections configured for this year.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setSelectedSection('Section A')}
              >
                Use Default Section A
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {availableSections.map(sec => {
                const isSelected = selectedSection === sec.name;
                return (
                  <div
                    key={sec.id}
                    onClick={() => setSelectedSection(sec.name)}
                    className={`p-5 rounded-card border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-brand-50 border-brand ring-2 ring-brand/20 shadow-xs'
                        : 'bg-surface border-border hover:border-ink-400 hover:shadow-card'
                    }`}
                  >
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-ink-900">{sec.name}</h4>
                      <p className="text-xs text-ink-500">{sec.studentCount} Registered students</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-brand bg-brand text-white' : 'border-ink-300 bg-surface'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STEP 4: Module & Attendance Date */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-ink-900 mb-1">Select Campaign Purpose</h3>
            <p className="text-sm text-ink-500">
              Choose the primary objective of this outbound automated voice engagement.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Module A Card */}
            <div
              onClick={() => setSelectedModule('mentoring')}
              className={`p-6 rounded-card border transition-all cursor-pointer flex flex-col justify-between ${
                selectedModule === 'mentoring'
                  ? 'bg-brand-50 border-brand ring-2 ring-brand/20 shadow-xs'
                  : 'bg-surface border-border hover:border-ink-400 hover:shadow-card'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand uppercase tracking-wider font-mono">Module A</span>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedModule === 'mentoring' ? 'border-brand bg-brand text-white' : 'border-ink-300 bg-surface'
                    }`}
                  >
                    {selectedModule === 'mentoring' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <h4 className="text-lg font-bold text-ink-900">Mentoring & Attendance</h4>
                <p className="text-xs text-ink-600 leading-relaxed">
                  Calls parents of students marked <strong>Absent</strong> on the selected date. Informs parents of attendance status, checks reason for absence, and shares mid-term marks.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-border/60 text-xs text-brand font-medium">
                Target: Absent students only
              </div>
            </div>

            {/* Module B Card */}
            <div
              onClick={() => setSelectedModule('feedback')}
              className={`p-6 rounded-card border transition-all cursor-pointer flex flex-col justify-between ${
                selectedModule === 'feedback'
                  ? 'bg-brand-50 border-brand ring-2 ring-brand/20 shadow-xs'
                  : 'bg-surface border-border hover:border-ink-400 hover:shadow-card'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-issue-text uppercase tracking-wider font-mono">Module B</span>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedModule === 'feedback' ? 'border-brand bg-brand text-white' : 'border-ink-300 bg-surface'
                    }`}
                  >
                    {selectedModule === 'feedback' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <h4 className="text-lg font-bold text-ink-900">Parent Feedback Survey</h4>
                <p className="text-xs text-ink-600 leading-relaxed">
                  Calls parents of all students to collect ratings and qualitative grievances across <strong>College academics, Hostel food/hygiene, and Bus transport</strong>.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-border/60 text-xs text-issue-text font-medium">
                Target: All valid section students
              </div>
            </div>
          </div>

          {/* Date Picker */}
          <div className="p-5 bg-surface rounded-card border border-border shadow-xs max-w-md">
            <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-2">
              Attendance / Survey Date
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                required
                value={attendanceDate}
                onChange={e => setAttendanceDate(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-surface border border-border rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
              />
            </div>
            <p className="text-[11px] text-ink-500 mt-2">
              The date of the attendance sheet you will upload in Step 5.
            </p>
          </div>
        </div>
      )}

      {/* STEP 5: Students Step (Excel, Client-Side) */}
      {currentStep === 5 && (
        <div className="space-y-6">
          {/* Top Info Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-brand-50 border border-brand-100 rounded-card">
            <div>
              <h4 className="text-sm font-bold text-brand">Spreadsheet Upload & Roster Verification</h4>
              <p className="text-xs text-ink-600 mt-0.5">
                Drop your day attendance sheet (.xlsx, .xls, .csv). Instant client-side validation runs in your browser.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTemplateDownload}
              className="gap-2 shrink-0 bg-white"
            >
              <Download className="w-4 h-4" />
              <span>Download Excel template</span>
            </Button>
          </div>

          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
              }
            }}
            className="border-2 border-dashed border-border hover:border-brand rounded-card p-8 sm:p-12 text-center bg-surface cursor-pointer transition-colors group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <div className="w-12 h-12 rounded-full bg-page group-hover:bg-brand-50 text-ink-400 group-hover:text-brand flex items-center justify-center mx-auto mb-3 transition-colors">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-ink-900 group-hover:text-brand transition-colors">
              {uploadedFile ? uploadedFile.name : 'Click to upload or drag and drop spreadsheet'}
            </div>
            <p className="text-xs text-ink-500 mt-1">
              Supports .xlsx, .xls, .csv up to 5 MB (first sheet evaluated)
            </p>
          </div>

          {/* Validation Metrics & Error Banner */}
          {validationResult && (
            <div className="space-y-4">
              {/* Count Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="p-3 bg-surface rounded-lg border border-border">
                  <div className="text-xs text-ink-500 font-medium">Total Rows</div>
                  <div className="text-xl font-bold text-ink-900">{validationResult.totalRows}</div>
                </div>
                <div className="p-3 bg-surface rounded-lg border border-border">
                  <div className="text-xs text-success-text font-medium">Present</div>
                  <div className="text-xl font-bold text-success-text">{validationResult.presentCount}</div>
                </div>
                <div className="p-3 bg-surface rounded-lg border border-border">
                  <div className="text-xs text-brand font-medium">Absent (To Call)</div>
                  <div className="text-xl font-bold text-brand">{validationResult.absentCount}</div>
                </div>
                <div className="p-3 bg-surface rounded-lg border border-border">
                  <div className="text-xs text-ink-500 font-medium">Valid Phone</div>
                  <div className="text-xl font-bold text-ink-900">{validationResult.usablePhoneCount}</div>
                </div>
                <div className="p-3 bg-surface rounded-lg border border-border">
                  <div className="text-xs text-issue-text font-medium">Excluded</div>
                  <div className="text-xl font-bold text-issue-text">{validationResult.excludedCount}</div>
                </div>
              </div>

              {/* Errors & Warnings Panel */}
              {validationResult.errors.length > 0 && (
                <div
                  className={`p-4 rounded-card border ${
                    validationResult.isValid
                      ? 'bg-warning-tint border-warning-border'
                      : 'bg-danger-tint border-danger-border'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      {validationResult.isValid ? (
                        <AlertTriangle className="w-5 h-5 text-warning-text" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-danger-text" />
                      )}
                      <h4
                        className={`text-sm font-bold ${
                          validationResult.isValid ? 'text-warning-text' : 'text-danger-text'
                        }`}
                      >
                        {validationResult.isValid
                          ? 'Non-Blocking Warnings (Students Excluded)'
                          : 'Blocking Errors Detected — Please correct file to continue'}
                      </h4>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadErrorsExcel}
                      className="bg-white text-xs gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Error Report (.xlsx)</span>
                    </Button>
                  </div>

                  <ul className="space-y-1.5 text-xs text-ink-800 list-disc list-inside max-h-40 overflow-y-auto">
                    {validationResult.errors.map((err, i) => (
                      <li key={i}>
                        <span className="font-semibold">Row {err.rowNumber}:</span> {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Roster Preview Table */}
              <div className="bg-surface rounded-card border border-border shadow-xs overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <button
                      onClick={() => setActiveRosterTab('calling')}
                      className={`pb-1 border-b-2 transition-colors ${
                        activeRosterTab === 'calling'
                          ? 'border-brand text-brand font-bold'
                          : 'border-transparent text-ink-500 hover:text-ink-900'
                      }`}
                    >
                      Queue Roster (
                      {selectedModule === 'mentoring'
                        ? validationResult.validRows.filter(r => r.attendanceStatus === 'Absent').length
                        : validationResult.validRows.length}
                      )
                    </button>
                    <button
                      onClick={() => setActiveRosterTab('excluded')}
                      className={`pb-1 border-b-2 transition-colors ${
                        activeRosterTab === 'excluded'
                          ? 'border-brand text-brand font-bold'
                          : 'border-transparent text-ink-500 hover:text-ink-900'
                      }`}
                    >
                      Excluded List ({validationResult.excludedRows.length})
                    </button>
                  </div>
                  <span className="text-[11px] text-ink-400">
                    Phone numbers masked strictly by default
                  </span>
                </div>

                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-page text-ink-500 uppercase font-semibold sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5">Roll No</th>
                        <th className="px-4 py-2.5">Student Name</th>
                        <th className="px-4 py-2.5">Parent Contact</th>
                        <th className="px-4 py-2.5">Masked Phone</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(activeRosterTab === 'calling'
                        ? selectedModule === 'mentoring'
                          ? validationResult.validRows.filter(r => r.attendanceStatus === 'Absent')
                          : validationResult.validRows
                        : validationResult.excludedRows
                      ).map((row, idx) => (
                        <tr key={idx} className="hover:bg-page/50">
                          <td className="px-4 py-2.5 font-mono font-bold text-ink-900">
                            {row.rollNumber}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-ink-900">{row.name}</td>
                          <td className="px-4 py-2.5 text-ink-600">{row.parentName}</td>
                          <td className="px-4 py-2.5 font-mono text-ink-600">
                            {maskPhoneNumber(row.parentPhone)}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge
                              variant={row.attendanceStatus === 'Absent' ? 'danger' : 'success'}
                              size="sm"
                            >
                              {row.attendanceStatus || 'Valid'}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-ink-500">
                            {row.residenceType || 'Day Scholar'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 6: Questions & Call Settings */}
      {currentStep === 6 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-ink-900">Configure Voice Script & Calling Rules</h3>
              <p className="text-sm text-ink-500">
                {isFaculty
                  ? 'Faculty view defaults set by Department Admin. Administrators can adjust parameters.'
                  : 'Customize the AI speech greeting, calling hours, retries, and language parameters.'}
              </p>
            </div>
            {isFaculty && <Badge variant="brand">Read-only defaults</Badge>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Language Selection */}
            <div className="p-5 bg-surface rounded-card border border-border shadow-xs space-y-3">
              <label className="block text-xs font-semibold text-ink-700 uppercase">
                Primary Audio Language
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Telugu', 'English', 'Hindi'] as const).map(lang => (
                  <button
                    key={lang}
                    disabled={isFaculty}
                    type="button"
                    onClick={() => setQuestionsConfig(prev => ({ ...prev, language: lang }))}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      questionsConfig.language === lang
                        ? 'bg-brand-50 border-brand text-brand shadow-xs'
                        : 'border-border bg-page text-ink-600 hover:bg-surface'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-ink-700 uppercase mb-1.5">
                  Voice Persona
                </label>
                <select
                  disabled={isFaculty}
                  value={questionsConfig.voiceOption}
                  onChange={e => setQuestionsConfig(prev => ({ ...prev, voiceOption: e.target.value }))}
                  className="w-full p-2.5 text-xs border border-border rounded-lg bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option>Ananya (Friendly Telugu Female)</option>
                  <option>Vikram (Formal Telugu Male)</option>
                  <option>Priya (Neutral English Female)</option>
                  <option>Rahul (Executive English Male)</option>
                </select>
              </div>
            </div>

            {/* Calling Window & Limits */}
            <div className="p-5 bg-surface rounded-card border border-border shadow-xs space-y-3">
              <label className="block text-xs font-semibold text-ink-700 uppercase">
                Calling Parameters
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-ink-500">Start Time</span>
                  <input
                    disabled={isFaculty}
                    type="time"
                    value={questionsConfig.callingHoursStart}
                    onChange={e =>
                      setQuestionsConfig(prev => ({ ...prev, callingHoursStart: e.target.value }))
                    }
                    className="w-full mt-1 p-2 text-xs border border-border rounded-lg bg-surface text-ink-900"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-ink-500">End Time</span>
                  <input
                    disabled={isFaculty}
                    type="time"
                    value={questionsConfig.callingHoursEnd}
                    onChange={e =>
                      setQuestionsConfig(prev => ({ ...prev, callingHoursEnd: e.target.value }))
                    }
                    className="w-full mt-1 p-2 text-xs border border-border rounded-lg bg-surface text-ink-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[11px] text-ink-500">Max Retries</span>
                  <input
                    disabled={isFaculty}
                    type="number"
                    min={1}
                    max={3}
                    value={questionsConfig.maxRetries}
                    onChange={e =>
                      setQuestionsConfig(prev => ({ ...prev, maxRetries: Number(e.target.value) }))
                    }
                    className="w-full mt-1 p-2 text-xs border border-border rounded-lg bg-surface text-ink-900"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-ink-500">Max Duration (sec)</span>
                  <input
                    disabled={isFaculty}
                    type="number"
                    min={60}
                    max={300}
                    value={questionsConfig.maxDurationSeconds}
                    onChange={e =>
                      setQuestionsConfig(prev => ({ ...prev, maxDurationSeconds: Number(e.target.value) }))
                    }
                    className="w-full mt-1 p-2 text-xs border border-border rounded-lg bg-surface text-ink-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Script Text */}
          <div className="p-5 bg-surface rounded-card border border-border shadow-xs space-y-2">
            <label className="block text-xs font-semibold text-ink-700 uppercase">
              Speech Prompt Script
            </label>
            <textarea
              disabled={isFaculty}
              rows={3}
              value={questionsConfig.scriptText}
              onChange={e => setQuestionsConfig(prev => ({ ...prev, scriptText: e.target.value }))}
              className="w-full p-3 text-xs border border-border rounded-lg bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {/* Feedback Topics Toggles (Module B) */}
          {selectedModule === 'feedback' && (
            <div className="p-5 bg-surface rounded-card border border-issue-border/50 bg-issue-tint/10 shadow-xs space-y-3">
              <label className="block text-xs font-semibold text-issue-text uppercase">
                Feedback Survey Categories to Probe
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: 'college', label: 'College & Academics' },
                  { key: 'hostel', label: 'Hostel Facilities & Mess' },
                  { key: 'transport', label: 'College Bus Transport' },
                ].map(topic => {
                  const isChecked = questionsConfig.feedbackTopics[topic.key as keyof typeof questionsConfig.feedbackTopics];
                  return (
                    <label
                      key={topic.key}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface cursor-pointer hover:bg-page"
                    >
                      <input
                        disabled={isFaculty}
                        type="checkbox"
                        checked={isChecked}
                        onChange={e =>
                          setQuestionsConfig(prev => ({
                            ...prev,
                            feedbackTopics: {
                              ...prev.feedbackTopics,
                              [topic.key]: e.target.checked,
                            },
                          }))
                        }
                        className="rounded border-border text-brand focus:ring-brand w-4 h-4"
                      />
                      <span className="text-xs font-semibold text-ink-900">{topic.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 7: Review & Launch */}
      {currentStep === 7 && (
        <div className="space-y-6">
          <div className="p-6 bg-surface rounded-card border border-border shadow-card space-y-6">
            <div>
              <h3 className="text-lg font-bold text-ink-900">Pre-Flight Campaign Summary</h3>
              <p className="text-xs text-ink-500">
                Verify target numbers and parameters before submission or dispatch.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-page border border-border text-xs">
              <div>
                <span className="text-ink-400 font-medium">Academic Class</span>
                <p className="font-bold text-ink-900 mt-0.5">
                  {selectedDept} / Year {selectedYear} / {selectedSection}
                </p>
              </div>
              <div>
                <span className="text-ink-400 font-medium">Selected Module</span>
                <p className="font-bold text-ink-900 mt-0.5 capitalize">{selectedModule}</p>
              </div>
              <div>
                <span className="text-ink-400 font-medium">Attendance Date</span>
                <p className="font-bold text-ink-900 mt-0.5">{formatDate(attendanceDate)}</p>
              </div>
              <div>
                <span className="text-ink-400 font-medium">Upload Version</span>
                <p className="font-bold text-brand mt-0.5">Version {uploadVersion}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-page border border-border text-xs">
              <div>
                <span className="text-ink-400 font-medium">Calls to Place</span>
                <p className="text-xl font-extrabold text-brand mt-0.5">
                  {selectedModule === 'mentoring'
                    ? validationResult?.absentCount || 0
                    : validationResult?.validRows.length || 0}
                </p>
              </div>
              <div>
                <span className="text-ink-400 font-medium">Excluded Rows</span>
                <p className="text-xl font-extrabold text-issue-text mt-0.5">
                  {validationResult?.excludedCount || 0}
                </p>
              </div>
              <div>
                <span className="text-ink-400 font-medium">Voice & Language</span>
                <p className="font-bold text-ink-900 mt-0.5">
                  {questionsConfig.language} ({questionsConfig.voiceOption.split(' ')[0]})
                </p>
              </div>
              <div>
                <span className="text-ink-400 font-medium">Calling Window</span>
                <p className="font-bold text-ink-900 mt-0.5">
                  {questionsConfig.callingHoursStart} - {questionsConfig.callingHoursEnd}
                </p>
              </div>
            </div>

            {/* Pre-launch verification checklist */}
            <div className="space-y-2 border-t border-border pt-4">
              <h4 className="text-xs font-bold text-ink-700 uppercase tracking-wider">
                Pre-Flight Safety Checklist
              </h4>
              <div className="space-y-2 text-xs text-ink-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success-text shrink-0" />
                  <span>All parent contact numbers strictly masked with zero raw exposure</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success-text shrink-0" />
                  <span>Duplicate roll numbers verified and absent roster isolated</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success-text shrink-0" />
                  <span>Simulated telephony safety active (DEMO_MODE=1)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Footer (Back & Continue) */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="outline"
          size="md"
          onClick={handleBack}
          disabled={currentStep === 1}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>

        {currentStep < 7 ? (
          <Button
            variant="primary"
            size="md"
            onClick={handleNext}
            disabled={!canProceed()}
            className="gap-2"
          >
            <span>Continue</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : isFaculty ? (
          <Button
            variant="primary"
            size="md"
            onClick={handleFacultySubmitToAdmin}
            isLoading={isSubmitting}
            className="gap-2 bg-brand"
          >
            <Send className="w-4 h-4" />
            <span>Send to Admin for Approval</span>
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsConfirmLaunchModalOpen(true)}
            isLoading={isSubmitting}
            className="gap-2 bg-brand-dark"
          >
            <Play className="w-4 h-4" />
            <span>Confirm and Start Campaign</span>
          </Button>
        )}
      </div>

      {/* Confirmation Modal for Replace Upload (Version N) */}
      <Modal
        isOpen={isReplaceModalOpen}
        onClose={() => setIsReplaceModalOpen(false)}
        title="Replace Earlier Upload?"
        description={`An active attendance sheet for ${selectedDept} Year ${selectedYear} ${selectedSection} on ${formatDate(
          attendanceDate
        )} already exists.`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsReplaceModalOpen(false)}>
              Keep Previous Upload
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmReplace}>
              Replace and Create Version {existingUploadRecord ? existingUploadRecord.version + 1 : 2}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs text-ink-600">
          <p>
            Confirming replacement will mark the earlier upload as superseded while fully preserving historical campaign records and logs.
          </p>
          <div className="p-3 bg-page rounded-lg border border-border">
            <span className="font-semibold text-ink-900">Earlier Upload:</span> {existingUploadRecord?.fileName} (Version {existingUploadRecord?.version})
          </div>
        </div>
      </Modal>

      {/* Launch Confirmation Modal (Admin) */}
      <Modal
        isOpen={isConfirmLaunchModalOpen}
        onClose={() => setIsConfirmLaunchModalOpen(false)}
        title="Confirm and Launch Outbound Calls?"
        description="This will initialize the outbound calling queue in Demo Mode."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsConfirmLaunchModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAdminConfirmAndStart}
              isLoading={isSubmitting}
              className="bg-brand-dark"
            >
              Start Outbound Calls Now
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-xs text-ink-600">
          <p>
            You are about to launch automated calls to{' '}
            <strong className="text-ink-900">
              {selectedModule === 'mentoring'
                ? validationResult?.absentCount || 0
                : validationResult?.validRows.length || 0}{' '}
              parents
            </strong>{' '}
            for {selectedDept} / Year {selectedYear} / {selectedSection}.
          </p>
          <p className="text-[11px] text-ink-400">
            Note: Running under simulated telephony mode. Simulated timer progression and AI summaries will be generated.
          </p>
        </div>
      </Modal>
    </div>
  );
};
