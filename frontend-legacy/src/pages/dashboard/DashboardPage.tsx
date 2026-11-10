import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  PhoneCall,
  AlertCircle,
  CheckCircle2,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
  FileSpreadsheet,
  Check,
  ChevronRight,
  ExternalLink,
  Layers,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { getActiveUser, getDashboardSummary, approveCampaign, returnCampaignWithNote } from '../../data/api';
import { DashboardSummary, User } from '../../data/types';
import { formatDate } from '../../lib/utils';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Approval modal state (for Admin/Principal)
  const [selectedPendingCampaignId, setSelectedPendingCampaignId] = useState<number | null>(null);
  const [returnNote, setReturnNote] = useState('');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const active = await getActiveUser();
      setUser(active);
      const data = await getDashboardSummary(active.role, active.department);
      setSummary(data);
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleApprove = async (campaignId: number) => {
    try {
      await approveCampaign(campaignId);
      showToast('Campaign approved successfully and ready for launch', 'success');
      const active = await getActiveUser();
      const updated = await getDashboardSummary(active.role, active.department);
      setSummary(updated);
    } catch {
      showToast('Failed to approve campaign', 'error');
    }
  };

  const handleReturn = async () => {
    if (!selectedPendingCampaignId) return;
    try {
      await returnCampaignWithNote(selectedPendingCampaignId, returnNote || 'Please review student phone numbers.');
      showToast('Campaign returned to faculty with feedback note', 'info');
      setIsReturnModalOpen(false);
      setReturnNote('');
      const active = await getActiveUser();
      const updated = await getDashboardSummary(active.role, active.department);
      setSummary(updated);
    } catch {
      showToast('Failed to return campaign', 'error');
    }
  };

  const canCreateCampaign = user?.role === 'admin' || user?.role === 'principal' || user?.role === 'faculty';
  const isAdminOrPrincipal = user?.role === 'admin' || user?.role === 'principal';

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Banner Header (matching frame_24s.jpg) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.18em] mb-1">
            YOUR WORKSPACE, AT A GLANCE
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-900 tracking-tight">
            Let's get connected.
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            A new conversation starts with a well-prepared campaign.
          </p>
        </div>

        {canCreateCampaign && (
          <Link
            to="/app/campaign/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-dark text-white text-xs font-semibold hover:bg-ink-900 transition-all shadow-card self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New campaign</span>
          </Link>
        )}
      </div>

      {/* 3 Primary Stat Cards (matching frame_24s.jpg) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            {/* Card 1: Prepared campaigns */}
            <div className="p-6 rounded-card border border-border bg-surface shadow-xs flex flex-col justify-between min-h-[120px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-600">Prepared campaigns</span>
                <div className="w-8 h-8 rounded-lg bg-page border border-border flex items-center justify-center text-ink-700">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-ink-900 font-sans tracking-tight">
                {String(summary?.preparedCampaignsCount ?? summary?.recentCampaigns.length ?? 0).padStart(2, '0')}
              </div>
            </div>

            {/* Card 2: Student records */}
            <div className="p-6 rounded-card border border-border bg-surface shadow-xs flex flex-col justify-between min-h-[120px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-600">Student records</span>
                <div className="w-8 h-8 rounded-lg bg-page border border-border flex items-center justify-center text-ink-700">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-ink-900 font-sans tracking-tight">
                {String(summary?.studentRecordsCount ?? 0).padStart(2, '0')}
              </div>
            </div>

            {/* Card 3: Completed calls */}
            <div className="p-6 rounded-card border border-border bg-surface shadow-xs flex flex-col justify-between min-h-[120px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-600">Completed calls</span>
                <div className="w-8 h-8 rounded-lg bg-page border border-border flex items-center justify-center text-ink-700">
                  <PhoneCall className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-ink-900 font-sans tracking-tight">
                  {String(summary?.callsCompleted ?? 0).padStart(2, '0')}
                </div>
                <div className="text-[11px] text-ink-400 mt-0.5">
                  {(summary?.callsCompleted ?? 0) > 0 ? 'Connected with parents' : 'Calling not connected'}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Guide Panel: "From student list to ready-to-go" (matching frame_24s.jpg) */}
      <div className="rounded-2xl bg-page border border-border p-6 sm:p-8 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Hero Area */}
          <div className="lg:col-span-5 space-y-4">
            <div className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.18em]">
              A FEW STEPS. ALL SET.
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 tracking-tight leading-snug">
              From student list<br />to ready-to-go.
            </h2>
            {canCreateCampaign && (
              <div className="pt-2">
                <Link
                  to="/app/campaign/new"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-dark text-white text-xs font-semibold hover:bg-ink-900 transition-all shadow-card"
                >
                  <span>Create campaign</span>
                  <span className="font-mono text-xs">↗</span>
                </Link>
              </div>
            )}
          </div>

          {/* Right 3 Stacked Cards */}
          <div className="lg:col-span-7 space-y-3">
            {/* Step 1 */}
            <div className="p-4 rounded-xl border border-border bg-surface shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <span className="font-mono text-xs font-bold text-ink-400">01</span>
                <div className="w-8 h-8 rounded-lg bg-page border border-border flex items-center justify-center text-ink-700">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink-900">Select your class</h4>
                  <p className="text-[11px] text-ink-500 mt-0.5">Department · Year · Section</p>
                </div>
              </div>
              <Check className="w-4 h-4 text-ink-400" />
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl border border-border bg-surface shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <span className="font-mono text-xs font-bold text-ink-400">02</span>
                <div className="w-8 h-8 rounded-lg bg-page border border-border flex items-center justify-center text-ink-700">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink-900">Add your students</h4>
                  <p className="text-[11px] text-ink-500 mt-0.5">Upload · Validate · Confirm</p>
                </div>
              </div>
              <Check className="w-4 h-4 text-ink-400" />
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl border border-border bg-surface shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <span className="font-mono text-xs font-bold text-ink-400">03</span>
                <div className="w-8 h-8 rounded-lg bg-page border border-border flex items-center justify-center text-ink-700">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink-900">Make it yours</h4>
                  <p className="text-[11px] text-ink-500 mt-0.5">Questions · Settings · Review</p>
                </div>
              </div>
              <Check className="w-4 h-4 text-ink-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approvals (For Admin / Principal) */}
      {isAdminOrPrincipal && summary?.pendingApprovals && summary.pendingApprovals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand animate-ping" />
              <h3 className="text-base font-bold text-ink-900">Pending Campaign Approvals</h3>
            </div>
            <span className="text-xs font-semibold text-brand bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
              {summary.pendingApprovals.length} Require Admin Confirmation
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.pendingApprovals.map(camp => (
              <div key={camp.id} className="p-5 rounded-card border border-brand-200 bg-surface shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-ink-900">{camp.title}</h4>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Submitted by {camp.createdBy} · {camp.totalTargetCalls} target parents
                    </p>
                  </div>
                  <Badge variant="brand" size="sm">Awaiting Start</Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                  <span className="text-ink-400">Date: {formatDate(camp.attendanceDate)}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPendingCampaignId(camp.id);
                        setIsReturnModalOpen(true);
                      }}
                    >
                      Return with Note
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-brand-dark"
                      onClick={() => handleApprove(camp.id)}
                    >
                      Approve & Confirm
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Campaigns Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ink-900">Recent Campaigns</h3>
          <Link to="/app/reports" className="text-xs font-semibold text-ink-600 hover:text-ink-900 flex items-center gap-1">
            <span>View all reports</span>
            <span className="font-mono text-xs">↗</span>
          </Link>
        </div>

        {summary?.recentCampaigns.length === 0 ? (
          <div className="p-8 text-center bg-surface border border-dashed border-border rounded-card space-y-2">
            <p className="text-sm font-medium text-ink-700">No campaigns yet.</p>
            <p className="text-xs text-ink-400">Confirmed campaigns will appear here.</p>
          </div>
        ) : (
          <div className="bg-surface rounded-card border border-border divide-y divide-border overflow-hidden shadow-xs">
            {summary?.recentCampaigns.map(camp => (
              <div key={camp.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-page/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h4 className="text-sm font-bold text-ink-900">{camp.title}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-page border border-border text-ink-600 capitalize">
                      {camp.module}
                    </span>
                  </div>
                  <p className="text-xs text-ink-400">
                    Created on {formatDate(camp.createdAt)} · {camp.totalTargetCalls} targets
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      camp.status === 'completed'
                        ? 'success'
                        : camp.status === 'in_progress'
                        ? 'brand'
                        : 'default'
                    }
                    size="sm"
                  >
                    {camp.status.replace('_', ' ')}
                  </Badge>

                  {camp.status === 'in_progress' && (
                    <Link
                      to={`/app/campaign/${camp.id}/monitor`}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      Open Monitor →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Return Note Modal */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Return Campaign to Faculty"
        description="Provide a note explaining what needs revision before approval."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsReturnModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleReturn}>
              Send Return Note
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <textarea
            value={returnNote}
            onChange={e => setReturnNote(e.target.value)}
            placeholder="e.g. Please verify student absent list for Section A..."
            className="w-full h-24 p-3 border border-border rounded-lg bg-surface text-ink-900 text-xs focus:ring-1 focus:ring-brand"
          />
        </div>
      </Modal>
    </div>
  );
};
