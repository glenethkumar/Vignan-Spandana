import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  PhoneCall,
  AlertCircle,
  CheckCircle2,
  PlusCircle,
  ArrowRight,
  Clock,
  Sparkles,
  FileSpreadsheet,
  Check,
  ChevronRight,
  ExternalLink,
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

  // Approval modal state (for Admin)
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
  const isAdmin = user?.role === 'admin' || user?.role === 'principal';

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="text-[11px] font-bold text-brand uppercase tracking-widest mb-1">
            YOUR WORKSPACE, AT A GLANCE
          </div>
          <h1 className="text-3xl font-bold text-ink-900 tracking-tight">Let's get connected.</h1>
          <p className="text-sm text-ink-500 mt-1">
            Welcome back, {user?.fullName}. Here is your live attendance and parent issue overview.
          </p>
        </div>

        {canCreateCampaign && (
          <Link to="/app/campaign/new">
            <Button variant="primary" size="md" className="gap-2 shadow-sm w-full sm:w-auto">
              <PlusCircle className="w-4 h-4" />
              <span>New campaign</span>
            </Button>
          </Link>
        )}
      </div>

      {/* 4 Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {loading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            {/* 1. Absent Today */}
            <Card className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Absent today</p>
                <h3 className="text-3xl font-extrabold text-ink-900 mt-1">
                  {summary?.absentToday.toString().padStart(2, '0') || '00'}
                </h3>
                <span className="text-[11px] text-ink-400">Recorded in today's uploads</span>
              </div>
              <div className="p-3 rounded-full bg-brand-50 text-brand">
                <Users className="w-5 h-5" />
              </div>
            </Card>

            {/* 2. Calls Completed */}
            <Card className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Calls completed</p>
                <h3 className="text-3xl font-extrabold text-ink-900 mt-1">
                  {summary?.callsCompleted.toString().padStart(2, '0') || '00'}
                </h3>
                <span className="text-[11px] text-success-text font-medium">98% connection rate</span>
              </div>
              <div className="p-3 rounded-full bg-success-tint text-success-text">
                <PhoneCall className="w-5 h-5" />
              </div>
            </Card>

            {/* 3. Open Issues (Orange Accent strictly) */}
            <Card className="flex items-center justify-between border-issue-border/60 bg-issue-tint/20">
              <div>
                <p className="text-xs font-semibold text-issue-text uppercase tracking-wider">Open issues</p>
                <h3 className="text-3xl font-extrabold text-issue-text mt-1">
                  {summary?.openIssuesCount.toString().padStart(2, '0') || '00'}
                </h3>
                <span className="text-[11px] text-issue-text/80 font-medium">Under active review</span>
              </div>
              <div className="p-3 rounded-full bg-issue-tint text-issue-icon">
                <AlertCircle className="w-5 h-5" />
              </div>
            </Card>

            {/* 4. Resolved this week */}
            <Card className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Resolved this week</p>
                <h3 className="text-3xl font-extrabold text-ink-900 mt-1">
                  {summary?.resolvedThisWeek.toString().padStart(2, '0') || '00'}
                </h3>
                <span className="text-[11px] text-ink-400">Verified by parent call</span>
              </div>
              <div className="p-3 rounded-full bg-page text-ink-600">
                <CheckCircle2 className="w-5 h-5 text-success-text" />
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Soft Grey Guide Panel: "From student list to ready-to-go" */}
      <div className="rounded-card bg-page border border-border p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-brand" />
            <h3 className="text-base font-bold text-ink-900">From student list to ready-to-go</h3>
          </div>
          <span className="text-xs text-ink-500">Fast 3-minute guided workflow</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface rounded-xl p-4 border border-border space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-50 text-brand flex items-center justify-center text-xs font-bold">1</span>
              <h4 className="text-sm font-semibold text-ink-900">Select class & date</h4>
            </div>
            <p className="text-xs text-ink-500">Pick academic section and choose between Attendance or Feedback mode.</p>
          </div>

          <div className="bg-surface rounded-xl p-4 border border-border space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-50 text-brand flex items-center justify-center text-xs font-bold">2</span>
              <h4 className="text-sm font-semibold text-ink-900">Drop your spreadsheet</h4>
            </div>
            <p className="text-xs text-ink-500">System checks duplicate rolls, missing columns, and phone number formats.</p>
          </div>

          <div className="bg-surface rounded-xl p-4 border border-border space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-50 text-brand flex items-center justify-center text-xs font-bold">3</span>
              <h4 className="text-sm font-semibold text-ink-900">Launch or submit</h4>
            </div>
            <p className="text-xs text-ink-500">Faculty sends for approval; Admin reviews and triggers live outbound calls.</p>
          </div>
        </div>
      </div>

      {/* Admin: "Waiting for your approval" Section */}
      {isAdmin && summary && summary.pendingApprovals.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning-text" />
              <h3 className="text-base font-bold text-ink-900">Waiting for your approval</h3>
              <Badge variant="warning" size="sm">{summary.pendingApprovals.length}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {summary.pendingApprovals.map(campaign => (
              <div
                key={campaign.id}
                className="bg-surface rounded-card p-4 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-card"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink-900">{campaign.title}</span>
                    <Badge variant="brand" size="sm">{campaign.department} / Year {campaign.year} / {campaign.section}</Badge>
                  </div>
                  <div className="text-xs text-ink-500 flex items-center gap-3">
                    <span>Submitted by {campaign.createdBy}</span>
                    <span>•</span>
                    <span>Target calls: {campaign.totalTargetCalls}</span>
                    <span>•</span>
                    <span>Date: {formatDate(campaign.attendanceDate)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPendingCampaignId(campaign.id);
                      setIsReturnModalOpen(true);
                    }}
                  >
                    Return with note
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleApprove(campaign.id)}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve campaign</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dual Column: Recent Campaigns & Open Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Campaigns Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-ink-900">Recent campaigns</h3>
            <Link to="/app/reports" className="text-xs font-semibold text-brand hover:underline flex items-center gap-1">
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : !summary || summary.recentCampaigns.length === 0 ? (
            <EmptyState
              icon={<FileSpreadsheet className="w-6 h-6" />}
              title="No campaigns launched yet"
              description="Start your first parent outreach campaign using the guided wizard."
              actionLabel={canCreateCampaign ? "New campaign" : undefined}
              onAction={canCreateCampaign ? () => navigate('/app/campaign/new') : undefined}
            />
          ) : (
            <div className="space-y-3">
              {summary.recentCampaigns.map(c => (
                <div
                  key={c.id}
                  className="bg-surface rounded-card p-4 border border-border shadow-xs hover:border-ink-400 transition-colors flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink-900">{c.title}</span>
                      <Badge
                        variant={c.status === 'completed' ? 'success' : c.status === 'in_progress' ? 'brand' : 'default'}
                        size="sm"
                      >
                        {c.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-ink-500">
                      {c.department} · {c.section} · {c.completedCalls} of {c.totalTargetCalls} calls finished
                    </p>
                  </div>
                  <Link to="/app/reports">
                    <Button variant="ghost" size="sm" className="p-2">
                      <ChevronRight className="w-4 h-4 text-ink-400" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open Issues Column (Orange Alert Loop) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-ink-900">Active student issues</h3>
              {summary && summary.openIssuesCount > 0 && (
                <Badge variant="issue" size="sm">{summary.openIssuesCount}</Badge>
              )}
            </div>
            <Link to="/app/issues" className="text-xs font-semibold text-brand hover:underline flex items-center gap-1">
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : !summary || summary.openIssues.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-6 h-6 text-success-text" />}
              title="All parent issues resolved"
              description="No open student grievances currently pending verification or action."
            />
          ) : (
            <div className="space-y-3">
              {summary.openIssues.map(issue => (
                <div
                  key={issue.id}
                  className="bg-surface rounded-card p-4 border border-border shadow-xs hover:border-issue-border transition-colors flex items-center justify-between"
                >
                  <div className="space-y-1 max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink-900 truncate">{issue.studentName}</span>
                      <Badge variant="issue" size="sm">{issue.category}</Badge>
                      {issue.isCritical && (
                        <Badge variant="danger" size="sm">CRITICAL (3 Reopens)</Badge>
                      )}
                    </div>
                    <p className="text-xs text-ink-600 line-clamp-1">{issue.parentFeedback}</p>
                    <div className="text-[11px] text-ink-400">
                      Owner: {issue.ownerName} · Status: <span className="capitalize">{issue.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <Link to={`/app/issues`}>
                    <Button variant="ghost" size="sm" className="p-2">
                      <ChevronRight className="w-4 h-4 text-ink-400" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Return Note Modal (Admin only) */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Return Campaign to Faculty"
        description="Provide feedback to the faculty coordinator explaining what changes are needed."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsReturnModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleReturn}>
              Send Note & Return
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-ink-700 uppercase">Feedback Note</label>
          <textarea
            rows={3}
            value={returnNote}
            onChange={e => setReturnNote(e.target.value)}
            placeholder="e.g. Please verify the 4 students with missing parent mobile numbers and re-submit."
            className="w-full p-3 text-sm border border-border rounded-lg bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </Modal>
    </div>
  );
};
