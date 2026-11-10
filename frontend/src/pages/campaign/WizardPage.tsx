import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building,
  GraduationCap,
  Users,
  CheckCircle,
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Languages,
  Clock,
  RotateCcw,
  Sparkles,
  FileText,
  Trash2,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { SelectCard } from '../../components/common/SelectCard';
import { Stepper, StepItem } from '../../components/common/Stepper';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Banner } from '../../components/common/Banner';
import { Modal } from '../../components/common/Modal';
import { useAuth, useCampaigns, useStudents } from '../../data/api';
import { parseAndValidateStudentFile, ParsedRow } from '../../lib/excel';
import { maskPhone } from '../../lib/masking';
import { Student } from '../../data/types';

export const WizardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { createCampaign, draftCampaign, saveDraft, clearDraft } = useCampaigns();
  const { addStudents } = useStudents();
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stepper definition
  const steps: StepItem[] = [
    { id: 1, label: 'Department' },
    { id: 2, label: 'Year' },
    { id: 3, label: 'Section' },
    { id: 4, label: 'Module' },
    { id: 5, label: 'Students' },
    { id: 6, label: 'Questions' },
    { id: 7, label: 'Review' },
  ];

  // Wizard state initialized from draft if present
  const [currentStep, setCurrentStep] = useState(1);
  const [department, setDepartment] = useState(draftCampaign?.department || '');
  const [year, setYear] = useState<number | null>(draftCampaign?.year || null);
  const [section, setSection] = useState(draftCampaign?.section || '');
  const [moduleType, setModuleType] = useState<'mentoring' | 'feedback'>(
    draftCampaign?.module || 'mentoring'
  );
  const [attendanceDate, setAttendanceDate] = useState(
    draftCampaign?.attendanceDate || new Date().toISOString().split('T')[0]
  );

  // Upload & Student Roster state
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadVersion, setUploadVersion] = useState<number>(1);

  // Questions / Settings state
  const [language, setLanguage] = useState<'Telugu' | 'English' | 'Hindi'>('Telugu');
  const [voiceModel, setVoiceModel] = useState('Natural Telugu (Female)');
  const [callingWindow, setCallingWindow] = useState('09:00 - 18:00');
  const [maxRetries, setMaxRetries] = useState(1);

  // Dialogs
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const role = currentUser?.role || 'admin';
  const isAdminOrPrincipal = role === 'admin' || role === 'principal';
  const isFaculty = role === 'faculty';

  // Step headers and subtitles
  const stepMeta: Record<number, { title: string; subtitle: string; nextName: string }> = {
    1: { title: 'Select a department.', subtitle: 'Start with the right team.', nextName: 'Year' },
    2: { title: 'Choose the year.', subtitle: 'Select the student batch.', nextName: 'Section' },
    3: { title: 'Select the section.', subtitle: 'Keep the conversation focused.', nextName: 'Module' },
    4: { title: 'Choose your module.', subtitle: 'Two paths. One connected campus.', nextName: 'Students' },
    5: { title: 'Add your students.', subtitle: 'Upload, review, and confirm.', nextName: 'Questions' },
    6: { title: 'Make it yours.', subtitle: 'Questions · Settings · Preferences.', nextName: 'Review' },
    7: { title: 'Review and launch.', subtitle: 'Summary · Checklist · Confirmation.', nextName: 'Launch' },
  };

  // Construct breadcrumb for stepper
  const getBreadcrumb = () => {
    const parts: string[] = [];
    if (department) parts.push(department);
    if (year) parts.push(`${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} year`);
    if (section) parts.push(`Section ${section}`);
    if (moduleType) parts.push(moduleType === 'mentoring' ? 'Attendance / mentoring' : 'Feedback');
    return parts.join(' / ');
  };

  // Check if current step can continue
  const canContinue = () => {
    switch (currentStep) {
      case 1:
        return Boolean(department);
      case 2:
        return Boolean(year);
      case 3:
        return Boolean(section);
      case 4:
        return Boolean(moduleType && attendanceDate);
      case 5:
        return studentsList.length > 0 && !uploadError;
      case 6:
        return true;
      case 7:
        return true;
      default:
        return false;
    }
  };

  // Autosave draft
  useEffect(() => {
    saveDraft({
      department,
      year: year || undefined,
      section,
      module: moduleType,
      attendanceDate,
    });
  }, [department, year, section, moduleType, attendanceDate, saveDraft]);

  // Handle File Drop & Upload
  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setMissingColumns([]);

    // Check if re-uploading for same class
    if (studentsList.length > 0) {
      setPendingFile(file);
      setShowReplaceModal(true);
      return;
    }

    await processFile(file);
  };

  const processFile = async (file: File) => {
    try {
      setUploadedFileName(file.name);
      const validation = await parseAndValidateStudentFile(
        file,
        { department: department || 'CSE', year: year || 1, section: section || 'A' },
        moduleType
      );

      if (!validation.isValid) {
        const blocking = validation.errors.filter((e) => e.isBlocking);
        const msg = blocking.map((e) => e.message).join('; ');
        setUploadError(msg || 'Invalid student roster format.');
        setMissingColumns(validation.missingColumns || []);
        return;
      }

      const mappedStudents: Student[] = validation.validRows.map((r, idx) => ({
        id: idx + 1,
        rollNumber: r.rollNumber,
        name: r.name,
        parentName: r.parentName,
        parentPhone: r.parentPhone,
        department: r.department || department,
        year: r.year || year || 1,
        section: r.section || section,
        attendanceStatus: r.attendanceStatus,
        marks: r.marks,
        residenceType: r.residenceType,
        busRoute: r.busRoute,
        isActive: true,
      }));

      setStudentsList(mappedStudents);
      if (pendingFile) {
        setUploadVersion((v) => v + 1);
        setPendingFile(null);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to parse Excel file.');
    }
  };

  const handleNext = () => {
    if (canContinue() && currentStep < 7) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    } else {
      navigate('/app/dashboard');
    }
  };

  // Final submission
  const handleLaunchOrSend = async () => {
    const title = `${department} ${year} Year Sec ${section} - ${
      moduleType === 'mentoring' ? 'Attendance' : 'Feedback'
    }`;

    // Target call list: for mentoring module, only students marked absent
    const targetStudents =
      moduleType === 'mentoring'
        ? studentsList.filter((s) => s.attendanceStatus === 'Absent')
        : studentsList;

    const campaignId = await createCampaign({
      title,
      department,
      year: year || 1,
      section,
      module: moduleType,
      attendanceDate,
      totalTargetCalls: targetStudents.length,
      status: isAdminOrPrincipal ? 'in_progress' : 'draft',
      createdBy: currentUser?.username || 'admin',
    });

    addStudents(studentsList);
    clearDraft();

    if (isAdminOrPrincipal) {
      navigate(`/app/campaign/monitor/${campaignId}`);
    } else {
      navigate('/app/dashboard');
    }
  };

  return (
    <div className="w-full max-w-5xl flex flex-col gap-8 text-left animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between pb-2 border-b border-hairline/60">
        <div>
          <span className="text-[11px] font-bold tracking-eyebrow uppercase text-brand">
            New Campaign
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight mt-1">
            {stepMeta[currentStep].title}
          </h1>
          <p className="mt-1 text-sm text-muted font-normal">
            {stepMeta[currentStep].subtitle}
          </p>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold tracking-eyebrow uppercase text-muted">
            STEP
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-3xl sm:text-4xl font-bold text-neutral-400">
              0{currentStep}
            </span>
            <span className="text-xs font-semibold text-muted">/ 07</span>
          </div>
        </div>
      </div>

      {/* 7-Step Stepper & Breadcrumb */}
      <Stepper
        steps={steps}
        currentStep={currentStep}
        breadcrumb={currentStep > 1 ? getBreadcrumb() : undefined}
        onStepClick={(s) => s <= currentStep && setCurrentStep(s)}
      />

      {/* Step 1: Department Grid */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {[
            { id: 'CSE', name: 'Computer Science', desc: 'Computer Science & Engineering' },
            { id: 'CSE-AI', name: 'Artificial Intelligence', desc: 'CSE Artificial Intelligence & ML' },
            { id: 'IT', name: 'Information Technology', desc: 'Information Technology Department' },
            { id: 'ECE', name: 'Electronics & Comm.', desc: 'Electronics & Communication Eng.' },
            { id: 'EEE', name: 'Electrical & Electronics', desc: 'Electrical & Electronics Eng.' },
            { id: 'MECH', name: 'Mechanical Engineering', desc: 'Mechanical Engineering Department' },
            { id: 'CIVIL', name: 'Civil Engineering', desc: 'Civil Engineering Department' },
          ].map((dept) => (
            <SelectCard
              key={dept.id}
              title={dept.id}
              subtitle={dept.desc}
              icon={<Building className="w-5 h-5" />}
              selected={department === dept.id}
              onClick={() => setDepartment(dept.id)}
              className="min-h-[186px]"
            />
          ))}
        </div>
      )}

      {/* Step 2: Academic Year */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { num: 1, label: '1st year', desc: 'Batch of 2024–2028', wm: '01' },
            { num: 2, label: '2nd year', desc: 'Batch of 2023–2027', wm: '02' },
            { num: 3, label: '3rd year', desc: 'Batch of 2022–2026', wm: '03' },
            { num: 4, label: '4th year', desc: 'Batch of 2021–2025', wm: '04' },
          ].map((y) => (
            <SelectCard
              key={y.num}
              watermark={y.wm}
              title={y.label}
              subtitle={y.desc}
              selected={year === y.num}
              onClick={() => setYear(y.num)}
              className="min-h-[180px]"
            />
          ))}
        </div>
      )}

      {/* Step 3: Section */}
      {currentStep === 3 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          {['A', 'B', 'C', 'D', 'E', 'F'].map((sec) => (
            <SelectCard
              key={sec}
              watermark={sec}
              title={`Section ${sec}`}
              subtitle="60 enrolled students"
              selected={section === sec}
              onClick={() => setSection(sec)}
              className="min-h-[160px]"
            />
          ))}
        </div>
      )}

      {/* Step 4: Module Selection */}
      {currentStep === 4 && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <SelectCard
              title="Mentoring & attendance"
              subtitle="Attendance, academics, and student support. Calls all absent students automatically."
              icon={<FileSpreadsheet className="w-5 h-5" />}
              selected={moduleType === 'mentoring'}
              onClick={() => setModuleType('mentoring')}
              badge={<Badge variant="brand">Automated Absentees</Badge>}
              className="min-h-[190px]"
            />
            <SelectCard
              title="Feedback"
              subtitle="Class, hostel, and transport experiences. Gathers qualitative parent satisfaction."
              icon={<Sparkles className="w-5 h-5" />}
              selected={moduleType === 'feedback'}
              onClick={() => setModuleType('feedback')}
              badge={<Badge variant="alert">Issue Loop Active</Badge>}
              className="min-h-[190px]"
            />
          </div>

          <div className="p-6 bg-white rounded-card border border-hairline shadow-soft max-w-md">
            <label className="text-sm font-semibold text-text-main flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-muted" />
              <span>Attendance date</span>
            </label>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="w-full h-11 px-4 rounded-input border border-input-border text-sm font-medium outline-none focus:border-brand focus:ring-4 focus:ring-brand-50"
            />
            <p className="mt-2 text-xs text-muted">
              Select the lecture date corresponding to this student roster.
            </p>
          </div>
        </div>
      )}

      {/* Step 5: Students List */}
      {currentStep === 5 && (
        <div className="flex flex-col gap-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
            className="w-full min-h-[265px] rounded-card border-2 border-dashed border-[#D5D8DD] bg-[#FAFAFA] hover:bg-[#F5F6F8] transition-colors p-8 flex flex-col items-center justify-center text-center cursor-pointer select-none"
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              }}
            />

            <div className="w-14 h-14 rounded-2xl bg-white border border-hairline flex items-center justify-center text-ink shadow-soft mb-4">
              <Upload className="w-6 h-6" />
            </div>

            <h3 className="font-display text-2xl font-bold text-ink tracking-tight">
              Drop your student list here.
            </h3>
            <p className="mt-1.5 text-sm text-muted">
              CSV or Excel · Up to 5 MB · 5,000 students
            </p>

            <Button
              size="sm"
              className="mt-5 rounded-btn font-semibold"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Browse files →
            </Button>

            <div className="mt-6 pt-4 border-t border-hairline/80 w-full max-w-md flex items-center justify-between text-xs text-muted font-medium">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>First worksheet only</span>
              </span>
              <a
                href="/sample_attendance_template.xlsx"
                download
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-brand hover:underline font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download template</span>
              </a>
            </div>
          </div>

          {/* Inline Error Banner */}
          {uploadError && (
            <Banner
              variant="error"
              title="Roster Validation Notice"
              action={
                <a
                  href="/sample_attendance_template.xlsx"
                  download
                  className="font-bold underline text-xs text-red-900"
                >
                  Download template & verify headers
                </a>
              }
            >
              <div>{uploadError}</div>
              {missingColumns.length > 0 && (
                <div className="mt-1 font-mono text-xs">
                  Missing required columns: {missingColumns.join(', ')}
                </div>
              )}
            </Banner>
          )}

          {/* Valid Roster Preview Card & Table */}
          {studentsList.length > 0 && !uploadError && (
            <div className="p-6 bg-white rounded-card border border-hairline shadow-soft flex flex-col gap-5 animate-fade-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-icon-box bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-base text-ink">
                        {uploadedFileName || 'Student Roster'}
                      </span>
                      {uploadVersion > 1 && (
                        <Badge variant="brand">Version {uploadVersion}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted">
                      {studentsList.length} verified records ready
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="neutral">
                    Present:{' '}
                    {studentsList.filter((s) => s.attendanceStatus === 'Present').length}
                  </Badge>
                  <Badge variant="alert">
                    Absent:{' '}
                    {studentsList.filter((s) => s.attendanceStatus === 'Absent').length}
                  </Badge>
                </div>
              </div>

              {/* Roster Table with Strictly Masked Phone Numbers */}
              <div className="overflow-x-auto border border-hairline rounded-input">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F5F6F8] border-b border-hairline text-muted uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Roll No</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Parent Name</th>
                      <th className="py-2.5 px-3">Parent Phone</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {studentsList.slice(0, 5).map((st) => (
                      <tr key={st.rollNumber} className="hover:bg-page">
                        <td className="py-2 px-3 font-mono font-semibold">
                          {st.rollNumber}
                        </td>
                        <td className="py-2 px-3 font-medium">{st.name}</td>
                        <td className="py-2 px-3 text-muted">{st.parentName}</td>
                        <td className="py-2 px-3 font-mono text-muted">
                          {maskPhone(st.parentPhone)}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              st.attendanceStatus === 'Present'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {st.attendanceStatus || 'Absent'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {studentsList.length > 5 && (
                <div className="text-center text-xs text-muted">
                  Showing first 5 of {studentsList.length} students
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 6: Questions & Settings */}
      {currentStep === 6 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-card border border-hairline shadow-soft flex flex-col gap-4">
            <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
              <Languages className="w-5 h-5 text-brand" />
              <span>Language & Voice</span>
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-main">
                Dialogue Language
              </label>
              <div className="flex gap-2">
                {(['Telugu', 'English', 'Hindi'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    disabled={isFaculty}
                    onClick={() => setLanguage(lang)}
                    className={`flex-1 py-2 px-3 rounded-input text-xs font-bold border transition-all ${
                      language === lang
                        ? 'bg-ink text-white border-ink'
                        : 'bg-page text-muted border-hairline hover:border-neutral-300'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-main">
                Voice Model
              </label>
              <input
                disabled={isFaculty}
                value={voiceModel}
                onChange={(e) => setVoiceModel(e.target.value)}
                className="w-full h-10 px-3 rounded-input border border-input-border text-xs font-medium"
              />
            </div>
          </div>

          <div className="p-6 bg-white rounded-card border border-hairline shadow-soft flex flex-col gap-4">
            <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand" />
              <span>Calling Window & Retries</span>
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-main">
                Permitted Hours
              </label>
              <input
                disabled={isFaculty}
                value={callingWindow}
                onChange={(e) => setCallingWindow(e.target.value)}
                className="w-full h-10 px-3 rounded-input border border-input-border text-xs font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-main">
                Unanswered Retries
              </label>
              <input
                type="number"
                disabled={isFaculty}
                value={maxRetries}
                onChange={(e) => setMaxRetries(Number(e.target.value))}
                min={0}
                max={2}
                className="w-full h-10 px-3 rounded-input border border-input-border text-xs font-medium"
              />
            </div>

            {isFaculty && (
              <span className="text-[11px] text-muted italic">
                Calling parameters are configured by Admin.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Step 7: Review & Launch */}
      {currentStep === 7 && (
        <div className="p-8 bg-white rounded-panel border border-hairline shadow-soft flex flex-col gap-6">
          <div className="flex items-center justify-between pb-4 border-b border-hairline">
            <div>
              <span className="text-xs font-bold uppercase tracking-eyebrow text-brand">
                Campaign Summary
              </span>
              <h2 className="font-display text-2xl font-bold text-ink mt-0.5">
                {department} · Year {year} · Section {section}
              </h2>
            </div>
            <Badge variant="brand" dot>
              {moduleType === 'mentoring' ? 'Mentoring & Attendance' : 'Student Feedback'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-page rounded-input">
              <span className="text-muted block font-medium">Lecture Date</span>
              <span className="font-bold text-ink mt-0.5 block">{attendanceDate}</span>
            </div>
            <div className="p-3 bg-page rounded-input">
              <span className="text-muted block font-medium">Total Students</span>
              <span className="font-bold text-ink mt-0.5 block">{studentsList.length}</span>
            </div>
            <div className="p-3 bg-page rounded-input">
              <span className="text-muted block font-medium">Queued Calls</span>
              <span className="font-bold text-ink mt-0.5 block">
                {moduleType === 'mentoring'
                  ? studentsList.filter((s) => s.attendanceStatus === 'Absent').length
                  : studentsList.length}
              </span>
            </div>
            <div className="p-3 bg-page rounded-input">
              <span className="text-muted block font-medium">Language</span>
              <span className="font-bold text-ink mt-0.5 block">{language}</span>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/60 rounded-input border border-emerald-200/60 flex items-start gap-3 text-xs text-emerald-900">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Validation checklist passed:</span> All phone
              numbers sanitized and masked. Roster adheres to attendance guidelines.
            </div>
          </div>
        </div>
      )}

      {/* Navigation Bottom Bar */}
      <div className="pt-6 border-t border-hairline flex items-center justify-between">
        <Button
          variant="secondary"
          size="md"
          onClick={handleBack}
          className="h-12 px-6 rounded-btn"
          icon={<ArrowLeft className="w-4 h-4" />}
          iconPosition="left"
        >
          Back
        </Button>

        <div className="hidden sm:block text-xs font-semibold text-muted">
          {currentStep < 7 ? (
            <span>Next: {stepMeta[currentStep].nextName}</span>
          ) : (
            <span>Ready for dispatch</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isFaculty && currentStep >= 5 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDiscardModal(true)}
              className="text-red-600 hover:bg-red-50"
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Discard draft
            </Button>
          )}

          {currentStep < 7 ? (
            <Button
              size="md"
              disabled={!canContinue()}
              onClick={handleNext}
              className="h-12 px-7 rounded-btn shadow-soft"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Continue
            </Button>
          ) : isFaculty ? (
            <Button
              size="md"
              onClick={handleLaunchOrSend}
              className="h-12 px-7 rounded-btn shadow-soft bg-ink"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Send to Admin →
            </Button>
          ) : (
            <Button
              size="md"
              onClick={() => setShowConfirmModal(true)}
              className="h-12 px-7 rounded-btn shadow-soft bg-ink"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Confirm and start →
            </Button>
          )}
        </div>
      </div>

      {/* Modal Dialogs */}
      <Modal
        isOpen={showReplaceModal}
        onClose={() => {
          setShowReplaceModal(false);
          setPendingFile(null);
        }}
        title="Replace Existing Roster?"
        subtitle="An attendance list has already been uploaded for this session."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowReplaceModal(false);
                setPendingFile(null);
              }}
            >
              Keep current
            </Button>
            <Button
              onClick={() => {
                setShowReplaceModal(false);
                if (pendingFile) processFile(pendingFile);
              }}
            >
              Replace with new version
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-main leading-relaxed">
          Uploading a new roster will update the call targets and create Version {uploadVersion + 1} of this session.
        </p>
      </Modal>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Campaign Dispatch"
        subtitle="Review calling parameters before initiating the session."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Back to review
            </Button>
            <Button onClick={handleLaunchOrSend}>
              Confirm and Start Calls →
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-main leading-relaxed">
          This action will start calling parent phone numbers in {department} Year {year} Section {section} within permitted calling hours ({callingWindow}).
        </p>
      </Modal>

      <Modal
        isOpen={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        title="Discard Draft?"
        subtitle="Your progress on this campaign will be permanently cleared."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDiscardModal(false)}>
              Keep draft
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                clearDraft();
                setShowDiscardModal(false);
                navigate('/app/dashboard');
              }}
            >
              Discard and exit
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-main leading-relaxed">
          Are you sure you want to discard this draft? Any uploaded student list for this session will be removed from your device.
        </p>
      </Modal>
    </div>
  );
};
