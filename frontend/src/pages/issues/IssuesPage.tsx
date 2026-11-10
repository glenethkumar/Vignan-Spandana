import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Search,
  Filter,
  User,
  PhoneCall,
  ChevronRight,
  ShieldAlert,
  Send,
  Building2,
  Bus,
  Home as HomeIcon,
  Sparkles,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/common/Skeleton';
import { useToast } from '../../components/common/Toast';
import {
  Issue,
  IssueCategory,
  IssueStatus,
  User as UserType,
  IssueTimelineEvent,
} from '../../data/types';
import {
  getActiveUser,
  listIssues,
  getIssue,
  updateIssueStatus,
  runConfirmationCall,
} from '../../data/api';
import { maskPhoneNumber } from '../../lib/masking';
import { formatDate, formatDateTime } from '../../lib/utils';

export const IssuesPage: React.FC = () => {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Issue for Detail Modal / Action Loop
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [isExecutingAction, setIsExecutingAction] = useState(false);

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    setLoading(true);
    const user = await getActiveUser();
    setCurrentUser(user);

    // Scoped category for issue owners
    const categoryFilter =
      user.role === 'college_coordinator'
        ? 'College'
        : user.role === 'hostel_dean'
        ? 'Hostel'
        : user.role === 'bus_correspondent'
        ? 'Bus'
        : undefined;

    const data = await listIssues({ role: user.role, category: categoryFilter });
    setIssues(data);
    setLoading(false);
  };

  const handleOpenDetail = (issue: Issue) => {
    setSelectedIssue(issue);
    setResolutionNotes(issue.resolutionNotes || '');
    setIsDetailModalOpen(true);
  };

  const handleStatusChange = async (newStatus: IssueStatus, comment: string) => {
    if (!selectedIssue || !currentUser) return;
    setIsExecutingAction(true);
    try {
      const updated = await updateIssueStatus(
        selectedIssue.id,
        newStatus,
        comment,
        currentUser.fullName || currentUser.username,
        resolutionNotes
      );
      setSelectedIssue(updated);
      showToast(`Issue status transitioned to ${newStatus.replace('_', ' ').toUpperCase()}`, 'success');
      loadIssues();
    } catch {
      showToast('Failed to update issue status', 'error');
    } finally {
      setIsExecutingAction(false);
    }
  };

  const handleRunConfirmationCall = async (simulatedResponse: 'Yes' | 'No') => {
    if (!selectedIssue) return;
    setIsExecutingAction(true);
    try {
      const updated = await runConfirmationCall(selectedIssue.id, simulatedResponse);
      setSelectedIssue(updated);
      setIsConfirmationModalOpen(false);

      if (simulatedResponse === 'Yes') {
        showToast('Parent confirmed resolution! Issue is now CLOSED.', 'success');
      } else {
        if (updated.isCritical) {
          showToast(
            `Parent reported issue persists (Reopen #${updated.reopenCount}). CRITICAL flag alerted to Admin!`,
            'error'
          );
        } else {
          showToast(`Parent reported issue persists. Reopened #${updated.reopenCount}.`, 'warning');
        }
      }
      loadIssues();
    } catch {
      showToast('Failed to execute confirmation call', 'error');
    } finally {
      setIsExecutingAction(false);
    }
  };

  const filteredIssues = issues.filter(i => {
    if (selectedCategory !== 'ALL' && i.category !== selectedCategory) return false;
    if (selectedStatus !== 'ALL' && i.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        i.studentName.toLowerCase().includes(q) ||
        i.rollNumber.toLowerCase().includes(q) ||
        i.parentFeedback.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getCategoryIcon = (category: IssueCategory) => {
    if (category === 'Hostel') return <HomeIcon className="w-4 h-4 text-issue-icon" />;
    if (category === 'Bus') return <Bus className="w-4 h-4 text-issue-icon" />;
    return <Building2 className="w-4 h-4 text-issue-icon" />;
  };

  const isOwnerOrAdmin = (issue: Issue) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.role === 'principal') return true;
    if (currentUser.role === 'college_coordinator' && issue.category === 'College') return true;
    if (currentUser.role === 'hostel_dean' && issue.category === 'Hostel') return true;
    if (currentUser.role === 'bus_correspondent' && issue.category === 'Bus') return true;
    return false;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-150">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="text-[11px] font-bold text-issue-text uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-issue-icon" />
            <span>CAMPUS ISSUE RESOLUTION LOOP</span>
          </div>
          <h1 className="text-3xl font-bold text-ink-900 tracking-tight">Parent Grievance Board</h1>
          <p className="text-sm text-ink-500 mt-1">
            Track student grievances from inception to verified parent sign-off. Critical alerts trigger at 3 reopens.
          </p>
        </div>

        {/* Demo Notification Label */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-issue-tint border border-issue-border text-xs text-issue-text font-medium">
          <Sparkles className="w-4 h-4 text-issue-icon" />
          <span>Demo verification loop active</span>
        </div>
      </div>

      {/* Filter and Category Strip */}
      <div className="p-4 bg-surface rounded-card border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search student, roll number, or issue details..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-page border border-border rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        {/* Category & Status Filter */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {(!currentUser || currentUser.role === 'admin' || currentUser.role === 'principal') && (
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="py-2 px-3 border border-border rounded-lg bg-page text-ink-700 font-medium"
            >
              <option value="ALL">All Categories</option>
              <option value="College">College & Academics</option>
              <option value="Hostel">Hostel & Mess</option>
              <option value="Bus">Bus Transport</option>
            </select>
          )}

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="py-2 px-3 border border-border rounded-lg bg-page text-ink-700 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="open">Open</option>
            <option value="owner_alerted">Owner Alerted</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved by Owner</option>
            <option value="reopened">Reopened</option>
            <option value="closed">Closed (Verified)</option>
          </select>
        </div>
      </div>

      {/* Issues Grid / List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : filteredIssues.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-8 h-8 text-success-text" />}
          title="No open issues"
          description="There are currently no active grievances matching your role and search filters."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIssues.map(issue => {
            const isClosed = issue.status === 'closed';
            return (
              <div
                key={issue.id}
                onClick={() => handleOpenDetail(issue)}
                className={`p-5 rounded-card border shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                  issue.isCritical
                    ? 'bg-danger-tint/20 border-danger-border ring-2 ring-danger-text/20 hover:shadow-card'
                    : isClosed
                    ? 'bg-surface border-border opacity-75 hover:opacity-100 hover:shadow-card'
                    : 'bg-surface border-issue-border/50 hover:border-issue-border hover:shadow-float'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-md bg-issue-tint text-issue-icon">
                        {getCategoryIcon(issue.category)}
                      </span>
                      <span className="text-xs font-bold text-ink-900">{issue.category} Issue</span>
                      {issue.isCritical && (
                        <Badge variant="danger" size="sm" className="font-extrabold animate-pulse">
                          CRITICAL (3 REOPENS)
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-ink-900 mt-1">
                      {issue.studentName} ({issue.rollNumber})
                    </h3>
                  </div>

                  <Badge
                    variant={
                      isClosed
                        ? 'success'
                        : issue.isCritical
                        ? 'danger'
                        : issue.status === 'reopened'
                        ? 'warning'
                        : 'issue'
                    }
                    size="sm"
                  >
                    {issue.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>

                {/* Grievance Description */}
                <p className="text-xs text-ink-700 leading-relaxed line-clamp-2">
                  "{issue.parentFeedback}"
                </p>

                {/* Footer Metadata */}
                <div className="pt-3 border-t border-border/70 flex items-center justify-between text-xs text-ink-500">
                  <div className="flex items-center gap-3">
                    <span>Owner: <strong>{issue.ownerName.split(' ')[0]}</strong></span>
                    {issue.reopenCount > 0 && (
                      <span className="flex items-center gap-1 text-warning-text font-bold">
                        <RotateCcw className="w-3 h-3" />
                        <span>Reopens: {issue.reopenCount}</span>
                      </span>
                    )}
                  </div>

                  <span className="text-brand font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Action Loop</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Issue Action & Timeline Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Issue #${selectedIssue?.id} · ${selectedIssue?.category}`}
        description={`${selectedIssue?.studentName} (${selectedIssue?.rollNumber}) · ${selectedIssue?.department} Year ${selectedIssue?.year} ${selectedIssue?.section}`}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-ink-500">
              {selectedIssue?.isCritical && (
                <span className="text-danger-text font-bold">
                  ⚠️ Critical Alert flagged to College Principal & Administrator
                </span>
              )}
            </span>
            <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedIssue && (
          <div className="space-y-6 text-xs">
            {/* Student & Parent Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-page border border-border">
              <div>
                <span className="text-ink-400">Assigned Owner</span>
                <p className="font-bold text-ink-900 mt-0.5">{selectedIssue.ownerName}</p>
              </div>
              <div>
                <span className="text-ink-400">Current Status</span>
                <p className="font-bold text-brand mt-0.5 uppercase">
                  {selectedIssue.status.replace('_', ' ')}
                </p>
              </div>
              <div>
                <span className="text-ink-400">Reopen Count</span>
                <p className="font-bold text-ink-900 mt-0.5">{selectedIssue.reopenCount}</p>
              </div>
              <div>
                <span className="text-ink-400">Recorded Date</span>
                <p className="font-bold text-ink-900 mt-0.5">{formatDate(selectedIssue.createdAt)}</p>
              </div>
            </div>

            {/* Parent Feedback Bubble */}
            <div className="p-4 rounded-lg bg-issue-tint/30 border border-issue-border/60 space-y-1">
              <span className="text-[11px] font-bold text-issue-text uppercase">
                Parent Feedback from Call
              </span>
              <p className="text-xs font-medium text-ink-900 leading-relaxed">
                "{selectedIssue.parentFeedback}"
              </p>
            </div>

            {/* Interactive State Machine Action Buttons */}
            {isOwnerOrAdmin(selectedIssue) && selectedIssue.status !== 'closed' && (
              <div className="p-4 rounded-card bg-surface border border-border shadow-xs space-y-3">
                <h4 className="font-bold text-ink-900 uppercase tracking-wider text-[11px]">
                  Take Corrective Action
                </h4>

                {/* Action 1: Mark In Progress */}
                {selectedIssue.status === 'open' || selectedIssue.status === 'owner_alerted' ? (
                  <Button
                    variant="primary"
                    size="sm"
                    className="gap-2"
                    isLoading={isExecutingAction}
                    onClick={() =>
                      handleStatusChange('in_progress', 'Owner began investigation and physical inspection.')
                    }
                  >
                    <span>Mark In Progress (Investigating)</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : null}

                {/* Action 2: Mark Resolved by Owner */}
                {selectedIssue.status === 'in_progress' || selectedIssue.status === 'reopened' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-ink-700 uppercase mb-1">
                        Resolution Notes
                      </label>
                      <textarea
                        rows={2}
                        value={resolutionNotes}
                        onChange={e => setResolutionNotes(e.target.value)}
                        placeholder="Document the physical repairs, schedule adjustments, or academic follow-up conducted..."
                        className="w-full p-2.5 text-xs border border-border rounded-lg bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      className="gap-2 bg-success-text"
                      isLoading={isExecutingAction}
                      onClick={() =>
                        handleStatusChange(
                          'resolved',
                          `Corrective action completed: ${resolutionNotes || 'Inspected and repaired.'}`
                        )
                      }
                    >
                      <Check className="w-4 h-4" />
                      <span>Submit Resolution & Trigger Verification</span>
                    </Button>
                  </div>
                ) : null}

                {/* Action 3: Run Automated Confirmation Call */}
                {selectedIssue.status === 'resolved' && (
                  <div className="p-4 rounded-lg bg-brand-50 border border-brand-100 space-y-3">
                    <div className="flex items-center gap-2 text-brand font-bold">
                      <PhoneCall className="w-4 h-4" />
                      <span>Automated Parent Verification Step</span>
                    </div>
                    <p className="text-xs text-ink-700">
                      Simulate calling the parent to confirm if the reported issue has been satisfactorily resolved.
                    </p>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="primary"
                        size="sm"
                        className="bg-success-text gap-2"
                        isLoading={isExecutingAction}
                        onClick={() => handleRunConfirmationCall('Yes')}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Simulate Parent: "Yes, Resolved" (Close)</span>
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="gap-2"
                        isLoading={isExecutingAction}
                        onClick={() => handleRunConfirmationCall('No')}
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Simulate Parent: "No, Still Issue" (Reopen)</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Audit Timeline */}
            <div className="space-y-3 border-t border-border pt-4">
              <h4 className="font-bold text-ink-900 uppercase tracking-wider text-[11px]">
                Issue Resolution Timeline & Audit Trail
              </h4>
              <div className="space-y-3 pl-2 border-l-2 border-border/80">
                {selectedIssue.timeline.map((event, idx) => (
                  <div key={idx} className="relative pl-4 space-y-0.5">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-brand ring-4 ring-white" />
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink-900 capitalize">
                        {event.statusTo.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-ink-400 font-mono">
                        by {event.performedBy}
                      </span>
                    </div>
                    <p className="text-xs text-ink-600">{event.comment}</p>
                    <span className="text-[10px] text-ink-400">
                      {formatDateTime(event.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
