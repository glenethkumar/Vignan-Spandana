import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Layers,
  Users,
  PhoneCall,
  ArrowRight,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  Play,
  Check,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { useAuth, useCampaigns, useStudents, useIssues } from '../../data/api';
import { Campaign, Issue } from '../../data/types';

export const DashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { campaigns, draftCampaign } = useCampaigns();
  const { students } = useStudents();
  const { issues } = useIssues();
  const navigate = useNavigate();

  const role = currentUser?.role || 'admin';
  const isAdminOrPrincipal = role === 'admin' || role === 'principal';
  const isFaculty = role === 'faculty';

  // Derived counts
  const totalCampaigns = campaigns.length;
  const totalStudents = students.length;
  const completedCalls = campaigns.reduce(
    (acc: number, c: Campaign) => acc + (c.completedCalls || 0),
    0
  );

  // Filtered lists
  const pendingApprovalCampaigns = campaigns.filter(
    (c: Campaign) => c.status === 'draft' || c.status === 'pending_approval'
  );
  const openIssues = issues.filter(
    (i: Issue) => i.status === 'open' || i.status === 'in_progress'
  );

  return (
    <div className="w-full flex flex-col gap-10 max-w-6xl text-left animate-fade-up">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-eyebrow uppercase text-brand">
            Your Workspace, at a Glance
          </span>
          <h1 className="font-display text-4xl sm:text-[46px] font-bold text-ink tracking-tight leading-tight mt-1">
            Let's get connected.
          </h1>
          <p className="mt-1.5 text-base text-muted font-normal">
            A new conversation starts with a well-prepared campaign.
          </p>
        </div>

        {(isAdminOrPrincipal || isFaculty) && (
          <Link to="/app/campaign/new">
            <Button
              size="md"
              className="rounded-btn font-semibold shadow-soft hover:shadow-md"
              icon={<Plus className="w-4 h-4" />}
            >
              {draftCampaign ? 'Continue campaign' : '+ New campaign'}
            </Button>
          </Link>
        )}
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Prepared campaigns"
          value={totalCampaigns}
          icon={<Layers className="w-4 h-4" />}
        />
        <StatCard
          title="Student records"
          value={totalStudents}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          title="Completed calls"
          value={completedCalls}
          caption={completedCalls === 0 ? 'Calling not connected' : undefined}
          icon={<PhoneCall className="w-4 h-4" />}
        />
      </div>

      {/* Guide Card Container */}
      <div className="p-8 sm:p-10 rounded-panel bg-gradient-to-br from-[#F5F6F8] via-[#F8F9FA] to-[#FFFFFF] border border-hairline shadow-soft grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-5 flex flex-col items-start">
          <span className="text-[11px] font-bold tracking-eyebrow uppercase text-brand mb-2">
            A Few Steps. All Set.
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight leading-snug">
            From student list to ready-to-go.
          </h2>
          <p className="mt-3 text-sm text-muted leading-relaxed font-normal">
            Set up departments, academic years, sections, and upload student rosters with automated phone verification.
          </p>

          <Link to="/app/campaign/new" className="mt-6">
            <Button
              size="md"
              className="rounded-btn font-semibold"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Create campaign ↗
            </Button>
          </Link>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-3.5">
          <div className="p-4 sm:p-5 bg-white rounded-card border border-hairline shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="w-8 h-8 rounded-full bg-icon-box text-ink font-bold text-xs flex items-center justify-center shrink-0">
                01
              </span>
              <div>
                <div className="font-display font-bold text-sm sm:text-base text-ink">
                  Select your class
                </div>
                <div className="text-xs sm:text-sm text-muted">
                  Department · Year · Section
                </div>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-white rounded-card border border-hairline shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="w-8 h-8 rounded-full bg-icon-box text-ink font-bold text-xs flex items-center justify-center shrink-0">
                02
              </span>
              <div>
                <div className="font-display font-bold text-sm sm:text-base text-ink">
                  Add your students
                </div>
                <div className="text-xs sm:text-sm text-muted">
                  Upload · Validate · Confirm
                </div>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-white rounded-card border border-hairline shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="w-8 h-8 rounded-full bg-icon-box text-ink font-bold text-xs flex items-center justify-center shrink-0">
                03
              </span>
              <div>
                <div className="font-display font-bold text-sm sm:text-base text-ink">
                  Make it yours
                </div>
                <div className="text-xs sm:text-sm text-muted">
                  Questions · Settings · Review
                </div>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>
        </div>
      </div>

      {/* Admin: Waiting for approval */}
      {isAdminOrPrincipal && pendingApprovalCampaigns.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-ink">
              Waiting for your approval ({pendingApprovalCampaigns.length})
            </h3>
            <span className="text-xs text-muted">
              Faculty submissions awaiting confirmation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pendingApprovalCampaigns.map((camp: Campaign) => (
              <div
                key={camp.id}
                className="p-5 bg-white rounded-card border border-hairline shadow-soft flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-base text-ink">
                      {camp.title}
                    </span>
                    <Badge variant="brand">{camp.status}</Badge>
                  </div>
                  <div className="text-xs text-muted mt-1">
                    {camp.department} · Year {camp.year} · Section {camp.section} · {camp.totalTargetCalls || 0} students
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => navigate(`/app/campaign/monitor/${camp.id}`)}
                  icon={<Play className="w-3.5 h-3.5" />}
                >
                  Review
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Open Issues */}
      {openIssues.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-issue-icon" />
              <h3 className="font-display text-xl font-bold text-ink">
                Open Issues ({openIssues.length})
              </h3>
            </div>
            <Link
              to="/app/issues"
              className="text-xs font-semibold text-issue hover:underline"
            >
              View issues board →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {openIssues.slice(0, 4).map((issue: Issue) => (
              <div
                key={issue.id}
                onClick={() => navigate('/app/issues')}
                className="p-5 bg-white rounded-card border border-hairline shadow-soft hover:border-issue-border transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="alert">{issue.category}</Badge>
                    <span className="text-xs text-muted">{issue.status}</span>
                  </div>
                  <p className="text-sm font-semibold text-text-main line-clamp-2">
                    {issue.parentFeedback}
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-hairline flex items-center justify-between text-xs text-muted">
                  <span>Student: {issue.rollNumber || issue.studentName}</span>
                  <span className="font-medium text-brand">Resolve →</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Campaigns */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-ink">
            Recent campaigns
          </h3>
          <Link
            to="/app/reports"
            className="text-xs font-semibold text-muted hover:text-ink"
          >
            All campaigns →
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-10 bg-white rounded-card border border-hairline text-center text-muted">
            <FileSpreadsheet className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
            <p className="font-semibold text-sm">No campaigns prepared yet</p>
            <p className="text-xs mt-1">Start by clicking "+ New campaign"</p>
          </div>
        ) : (
          <div className="bg-white rounded-card border border-hairline overflow-hidden shadow-soft">
            <div className="divide-y divide-hairline">
              {campaigns.slice(0, 5).map((camp: Campaign) => (
                <div
                  key={camp.id}
                  onClick={() => navigate(`/app/campaign/monitor/${camp.id}`)}
                  className="p-4 sm:p-5 flex items-center justify-between hover:bg-page transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-icon-box bg-icon-box text-text-main flex items-center justify-center shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-display font-bold text-sm text-ink">
                        {camp.title}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {camp.department} · Year {camp.year} · Section {camp.section} · {camp.totalTargetCalls} calls
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        camp.status === 'completed'
                          ? 'success'
                          : camp.status === 'in_progress'
                          ? 'brand'
                          : 'neutral'
                      }
                      dot
                    >
                      {camp.status}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
