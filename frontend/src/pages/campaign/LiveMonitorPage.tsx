import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  PhoneCall,
  PhoneForwarded,
  CheckCircle2,
  AlertCircle,
  Clock,
  Pause,
  Play,
  Square,
  ShieldCheck,
  RotateCcw,
  User,
  ArrowRight,
  FileText,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import {
  Campaign,
  CallRecord,
  CallStatus,
  User as UserType,
  Issue,
} from '../../data/types';
import {
  getCampaign,
  controlCampaign,
  getActiveUser,
  listStudents,
  updateIssueStatus,
} from '../../data/api';
import { maskPhoneNumber } from '../../lib/masking';
import { formatDuration } from '../../lib/utils';

interface QueueItem {
  id: number;
  studentId: number;
  rollNumber: string;
  studentName: string;
  parentName: string;
  maskedPhone: string;
  status: CallStatus;
  durationSeconds: number;
  outcome?: string;
  aiSummary?: string;
  transcriptTelugu?: string;
  transcriptEnglish?: string;
  issueCreated?: boolean;
}

export const LiveMonitorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentCallIndex, setCurrentCallIndex] = useState<number>(0);
  const [activeCallTimer, setActiveCallTimer] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isStopModalOpen, setIsStopModalOpen] = useState<boolean>(false);

  // Live timer interval ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadCampaignData() {
      const u = await getActiveUser();
      setCurrentUser(u);

      const campId = Number(id) || 1;
      const c = await getCampaign(campId);
      if (!c) {
        showToast('Campaign not found', 'error');
        navigate('/app');
        return;
      }
      setCampaign(c);

      // Load students to populate the simulated queue
      const students = await listStudents({
        department: c.department,
        year: c.year,
        section: c.section,
      });

      // Filter target students
      const targetStudents =
        c.module === 'mentoring'
          ? students.filter(s => s.attendanceStatus === 'Absent')
          : students;

      const queueItems: QueueItem[] = (targetStudents.length > 0 ? targetStudents : students.slice(0, 6)).map(
        (s, idx) => ({
          id: idx + 1,
          studentId: s.id,
          rollNumber: s.rollNumber,
          studentName: s.name,
          parentName: s.parentName,
          maskedPhone: maskPhoneNumber(s.parentPhone),
          status: idx === 0 ? 'calling' : 'queued',
          durationSeconds: 0,
        })
      );

      setQueue(queueItems);
      setCurrentCallIndex(0);
      setActiveCallTimer(0);
    }
    loadCampaignData();
  }, [id, navigate, showToast]);

  // Simulation loop: ticks call duration and advances queue
  useEffect(() => {
    if (isPaused || isCompleted || queue.length === 0) return;

    timerRef.current = setInterval(() => {
      setActiveCallTimer(prev => {
        const nextTime = prev + 1;

        // When call timer reaches ~4 seconds, change status from calling to connected
        if (nextTime === 4) {
          setQueue(curr =>
            curr.map((item, idx) =>
              idx === currentCallIndex ? { ...item, status: 'connected' } : item
            )
          );
        }

        // When call timer reaches ~12 seconds in demo simulation, complete this call and move to next
        if (nextTime >= 12) {
          finishCurrentCall(currentCallIndex);
          return 0;
        }

        return nextTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, isCompleted, currentCallIndex, queue.length]);

  const finishCurrentCall = (index: number) => {
    setQueue(curr => {
      const updated = [...curr];
      const current = updated[index];
      if (!current) return curr;

      const isMentoring = campaign?.module === 'mentoring';
      // Simulate outcome
      let outcome = isMentoring ? 'Absent Acknowledged (Leave Confirmed)' : 'Satisfied with Academics';
      let summary = isMentoring
        ? 'Parent confirmed absence due to medical leave. Student will return tomorrow.'
        : 'Parent expressed overall satisfaction with classroom teaching and lab hours.';
      let issueCreated = false;

      // In feedback campaign, simulate an issue on call index 1 or 2
      if (!isMentoring && (index === 1 || index === 2)) {
        outcome = index === 1 ? 'Issue Raised (Hostel)' : 'Issue Raised (Bus)';
        summary =
          index === 1
            ? 'Parent raised concern regarding cold drinking water dispenser in North Hostel block.'
            : 'Parent noted evening college bus route 12 was delayed by 25 minutes.';
        issueCreated = true;
      }

      updated[index] = {
        ...current,
        status: 'completed',
        durationSeconds: 65 + (index * 7) % 40,
        outcome,
        aiSummary: summary,
        transcriptTelugu:
          'AI: నమస్కారం, విజ్ఞాన్ కాలేజ్ నుండి కాల్.\nతల్లిదండ్రి: నమస్కారం, మా అబ్బాయి కాలేజీకి రెగ్యులర్ గా వస్తున్నాడు.\nAI: ధన్యవాదాలు, మీ స్పందన రికార్డ్ చేశాము.',
        transcriptEnglish:
          'AI: Hello from VIIT AI assistant.\nParent: Hello, our ward is attending regularly.\nAI: Thank you for confirming. Your response is recorded.',
        issueCreated,
      };

      // Set next call to calling if exists
      const nextIdx = index + 1;
      if (nextIdx < updated.length) {
        updated[nextIdx] = { ...updated[nextIdx], status: 'calling' };
        setCurrentCallIndex(nextIdx);
      } else {
        setIsCompleted(true);
        if (campaign) {
          controlCampaign(campaign.id, 'stop');
        }
        showToast('All outbound calls completed successfully!', 'success');
      }

      return updated;
    });
  };

  const handlePauseResume = async () => {
    if (!campaign) return;
    if (isPaused) {
      await controlCampaign(campaign.id, 'resume');
      setIsPaused(false);
      showToast('Live call queue resumed', 'info');
    } else {
      await controlCampaign(campaign.id, 'pause');
      setIsPaused(true);
      showToast('Live call queue paused', 'warning');
    }
  };

  const handleStopCampaign = async () => {
    if (!campaign) return;
    await controlCampaign(campaign.id, 'stop');
    setIsCompleted(true);
    setIsStopModalOpen(false);
    showToast('Campaign stopped by Administrator', 'info');
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'principal';
  const currentActiveCall = queue[currentCallIndex];

  // Counts
  const completedCount = queue.filter(q => q.status === 'completed').length;
  const inFlightCount = queue.filter(q => q.status === 'calling' || q.status === 'connected').length;
  const pendingCount = queue.filter(q => q.status === 'queued').length;
  const progressPercent = queue.length > 0 ? Math.round((completedCount / queue.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-in fade-in duration-150">
      {/* Top Banner: Demo Mode Guard Notice */}
      <div className="p-4 bg-brand-50 border border-brand-100 rounded-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center shrink-0">
            <Volume2 className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-ink-900">
                Live Outbound Call Monitor
              </h2>
              <Badge variant="brand" size="sm">Demo Mode · No Real Telephony</Badge>
            </div>
            <p className="text-xs text-ink-600 mt-0.5">
              Simulated queue progression with automated transcripts and AI grievance routing.
            </p>
          </div>
        </div>

        {/* Admin Queue Controls */}
        {isAdmin && !isCompleted && (
          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePauseResume}
              className="gap-1.5 bg-white text-xs"
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isPaused ? 'Resume Queue' : 'Pause Queue'}</span>
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsStopModalOpen(true)}
              className="gap-1.5 text-xs"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop Campaign</span>
            </Button>
          </div>
        )}
      </div>

      {/* Campaign Details & Live Progress Bar */}
      <div className="bg-surface rounded-card border border-border p-5 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-ink-900">{campaign?.title}</h3>
            <p className="text-xs text-ink-500">
              {campaign?.department} · Year {campaign?.year} · {campaign?.section} · Upload Version {campaign?.uploadVersion || 1}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-ink-400 font-medium">Queue Progress</span>
              <div className="text-sm font-bold text-brand">{progressPercent}% Completed</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-page rounded-full overflow-hidden border border-border">
          <div
            className="h-full bg-brand transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Counter Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center text-xs">
          <div className="p-2.5 rounded-lg bg-page border border-border">
            <span className="text-ink-400 font-medium">Total Targets</span>
            <div className="text-lg font-bold text-ink-900">{queue.length}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-success-tint/40 border border-success-border/40">
            <span className="text-success-text font-medium">Completed</span>
            <div className="text-lg font-bold text-success-text">{completedCount}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-brand-50 border border-brand-100">
            <span className="text-brand font-medium">In-Flight</span>
            <div className="text-lg font-bold text-brand">{inFlightCount}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-page border border-border">
            <span className="text-ink-400 font-medium">Remaining</span>
            <div className="text-lg font-bold text-ink-600">{pendingCount}</div>
          </div>
        </div>
      </div>

      {/* Active Call Card (When in flight) */}
      {!isCompleted && currentActiveCall && (
        <div className="bg-surface rounded-card border-2 border-brand shadow-float p-6 space-y-4 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-success-text animate-ping" />
              <span className="text-xs font-bold text-brand uppercase tracking-wider font-mono">
                {currentActiveCall.status === 'connected' ? 'Call Connected (Speaking)' : 'Dialing Parent...'}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-ink-900 bg-page px-3 py-1 rounded-md border border-border">
              <Clock className="w-3.5 h-3.5 text-brand" />
              <span>00:{activeCallTimer.toString().padStart(2, '0')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-ink-400">Student Roll & Name</span>
              <p className="font-bold text-ink-900 mt-0.5">
                {currentActiveCall.studentName} ({currentActiveCall.rollNumber})
              </p>
            </div>
            <div>
              <span className="text-ink-400">Parent / Guardian</span>
              <p className="font-bold text-ink-900 mt-0.5">{currentActiveCall.parentName}</p>
            </div>
            <div>
              <span className="text-ink-400">Masked Contact</span>
              <p className="font-mono font-bold text-ink-900 mt-0.5">
                {currentActiveCall.maskedPhone}
              </p>
            </div>
          </div>

          <div className="p-3 bg-brand-50/50 rounded-lg border border-brand-100 flex items-center gap-3 text-xs text-brand">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              Voice agent active in {campaign?.questionsConfig?.language || 'Telugu'}. Live sentiment and responses are being transcribed.
            </span>
          </div>
        </div>
      )}

      {/* Completed Success Banner */}
      {isCompleted && (
        <div className="p-6 bg-surface rounded-card border border-success-border bg-success-tint/20 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success-tint text-success-text flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink-900">Campaign Finished!</h3>
              <p className="text-xs text-ink-600">
                All {queue.length} target calls have completed. Transcripts, AI summaries, and grievances are saved.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/app/reports">
              <Button variant="primary" size="sm" className="gap-2">
                <FileText className="w-4 h-4" />
                <span>View Full Reports</span>
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Queue Roster Table */}
      <div className="bg-surface rounded-card border border-border shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h4 className="text-xs font-bold text-ink-700 uppercase tracking-wider">
            Call Dispatch Queue ({queue.length} Students)
          </h4>
          <span className="text-[11px] text-ink-400 font-mono">
            All numbers masked (+91 98*** **345)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-page text-ink-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Roll Number</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Parent Name</th>
                <th className="px-4 py-3">Masked Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Outcome / Grievance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {queue.map(item => {
                const isItemCalling = item.status === 'calling' || item.status === 'connected';
                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isItemCalling ? 'bg-brand-50/60 font-semibold' : 'hover:bg-page/50'
                    }`}
                  >
                    <td className="px-4 py-3 text-ink-400 font-mono">{item.id}</td>
                    <td className="px-4 py-3 font-mono font-bold text-ink-900">
                      {item.rollNumber}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink-900">{item.studentName}</td>
                    <td className="px-4 py-3 text-ink-600">{item.parentName}</td>
                    <td className="px-4 py-3 font-mono text-ink-600">{item.maskedPhone}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          item.status === 'completed'
                            ? 'success'
                            : isItemCalling
                            ? 'brand'
                            : 'default'
                        }
                        size="sm"
                      >
                        {item.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-ink-500">
                      {item.status === 'completed'
                        ? formatDuration(item.durationSeconds)
                        : isItemCalling
                        ? `00:${activeCallTimer.toString().padStart(2, '0')}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {item.outcome ? (
                        <div className="flex items-center gap-1.5">
                          {item.issueCreated && (
                            <span className="w-2 h-2 rounded-full bg-issue-icon shrink-0" />
                          )}
                          <span
                            className={
                              item.issueCreated
                                ? 'text-issue-text font-bold'
                                : 'text-ink-700 font-medium'
                            }
                          >
                            {item.outcome}
                          </span>
                        </div>
                      ) : (
                        <span className="text-ink-300">Queued for dialing</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stop Campaign Confirmation Modal */}
      <Modal
        isOpen={isStopModalOpen}
        onClose={() => setIsStopModalOpen(false)}
        title="Stop Live Campaign?"
        description="Are you sure you want to stop active calling? Unprocessed calls will be marked cancelled."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsStopModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleStopCampaign}>
              Stop Campaign Now
            </Button>
          </>
        }
      >
        <p className="text-xs text-ink-600">
          Already completed call records and parent grievances will be preserved in your history.
        </p>
      </Modal>
    </div>
  );
};
