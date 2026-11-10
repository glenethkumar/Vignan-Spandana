import React, { useState } from 'react';
import {
  AlertCircle,
  Building,
  Home,
  Bus,
  CheckCircle,
  PhoneCall,
  Clock,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useIssues, useAuth } from '../../data/api';
import { Issue, IssueCategory } from '../../data/types';

export const IssuesPage: React.FC = () => {
  const { issues, resolveIssue, confirmIssueResolution } = useIssues();
  const { currentUser } = useAuth();

  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const role = currentUser?.role || 'admin';
  const isAdminOrPrincipal = role === 'admin' || role === 'principal';

  // Filter issues based on role segregation
  const visibleIssues = issues.filter((issue: Issue) => {
    if (isAdminOrPrincipal) {
      return categoryFilter === 'all' || issue.category.toLowerCase() === categoryFilter.toLowerCase();
    }
    if (role === 'college_coordinator') return issue.category === 'College';
    if (role === 'hostel_dean') return issue.category === 'Hostel';
    if (role === 'bus_correspondent') return issue.category === 'Bus';
    return true;
  });

  const handleResolve = () => {
    if (selectedIssue && resolutionNotes) {
      resolveIssue(selectedIssue.id, resolutionNotes);
      setSelectedIssue(null);
      setResolutionNotes('');
    }
  };

  const handleParentConfirmation = (confirmed: boolean) => {
    if (selectedIssue) {
      confirmIssueResolution(selectedIssue.id, confirmed);
      setSelectedIssue(null);
    }
  };

  return (
    <div className="w-full flex flex-col gap-8 max-w-6xl text-left animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-eyebrow uppercase text-issue">
            <span className="w-2 h-2 rounded-full bg-issue-icon" />
            <span>Closed-Loop Resolution</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight mt-1">
            Parent Issues & Grievances
          </h1>
          <p className="mt-1 text-sm text-muted font-normal">
            Issues identified during feedback calls routed directly to designated category owners.
          </p>
        </div>

        {isAdminOrPrincipal && (
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 px-3 rounded-input border border-input-border text-xs font-semibold text-text-main bg-white outline-none focus:border-brand"
            >
              <option value="all">All categories</option>
              <option value="College">College / Academic</option>
              <option value="Hostel">Hostel</option>
              <option value="Bus">Transport / Bus</option>
            </select>
          </div>
        )}
      </div>

      {/* Grid of Issues */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleIssues.map((issue: Issue) => {
          const isCritical = (issue.reopenCount || 0) >= 3;

          return (
            <div
              key={issue.id}
              onClick={() => setSelectedIssue(issue)}
              className={`p-6 rounded-card border shadow-soft transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[220px] ${
                isCritical
                  ? 'bg-red-50/40 border-red-300 hover:border-red-400'
                  : 'bg-white border-hairline hover:border-issue-border hover:shadow-soft-hover'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-icon-box bg-issue-tint text-issue-icon flex items-center justify-center">
                      {issue.category === 'Hostel' ? (
                        <Home className="w-4 h-4" />
                      ) : issue.category === 'Bus' ? (
                        <Bus className="w-4 h-4" />
                      ) : (
                        <Building className="w-4 h-4" />
                      )}
                    </span>
                    <Badge variant="alert">{issue.category}</Badge>
                  </div>

                  {isCritical && (
                    <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase animate-pulse">
                      Critical
                    </span>
                  )}
                </div>

                <h3 className="font-display font-bold text-base text-ink line-clamp-2 leading-snug">
                  {issue.parentFeedback}
                </h3>
              </div>

              <div className="mt-4 pt-4 border-t border-hairline flex items-center justify-between text-xs text-muted">
                <span className="font-mono">Student: {issue.rollNumber || issue.studentName}</span>
                <Badge
                  variant={
                    issue.status === 'closed'
                      ? 'success'
                      : issue.status === 'resolved'
                      ? 'brand'
                      : 'alert'
                  }
                  dot
                >
                  {issue.status}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail & Action Modal */}
      <Modal
        isOpen={Boolean(selectedIssue)}
        onClose={() => setSelectedIssue(null)}
        title="Issue Resolution Workflow"
        subtitle={`Category: ${selectedIssue?.category.toUpperCase()} · Student: ${selectedIssue?.rollNumber} (${selectedIssue?.studentName})`}
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-muted">
              Reopens: {selectedIssue?.reopenCount || 0}
            </span>
            <Button variant="outline" onClick={() => setSelectedIssue(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedIssue && (
          <div className="flex flex-col gap-5 text-left text-xs">
            <div className="p-4 bg-issue-tint rounded-input border border-issue-border text-issue leading-relaxed">
              <span className="font-bold block mb-1">Parent Feedback:</span>
              "{selectedIssue.parentFeedback}"
            </div>

            {selectedIssue.status === 'open' || selectedIssue.status === 'in_progress' ? (
              <div className="flex flex-col gap-2.5">
                <label className="font-bold text-text-main text-sm">
                  Resolution Action Taken
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Detail the remedial action taken with the student/facility..."
                  className="w-full h-24 p-3 rounded-input border border-input-border text-xs outline-none focus:border-brand"
                />
                <Button
                  size="sm"
                  disabled={!resolutionNotes}
                  onClick={handleResolve}
                  className="w-fit mt-1"
                >
                  Mark as Resolved & Queue Confirmation Call →
                </Button>
              </div>
            ) : selectedIssue.status === 'resolved' ? (
              <div className="p-4 bg-emerald-50 rounded-input border border-emerald-200 text-emerald-900 flex flex-col gap-3">
                <span className="font-bold">Automated Follow-up Call Dispatched</span>
                <p>
                  A confirmation call has been scheduled to ask the parent if their concern was satisfactorily addressed.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleParentConfirmation(true)}
                  >
                    Parent confirmed: YES (Close issue)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => handleParentConfirmation(false)}
                  >
                    Parent said: NO (Reopen)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-neutral-100 rounded-input text-muted font-medium">
                Issue verified and closed following parent confirmation.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
