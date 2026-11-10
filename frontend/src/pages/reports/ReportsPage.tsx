import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Layers,
  PhoneCall,
  CheckCircle,
  Search,
  Download,
  FileSpreadsheet,
  Calendar,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import { Tabs } from '../../components/common/Tabs';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useCampaigns, useCallRecords } from '../../data/api';
import { maskPhone } from '../../lib/masking';
import { CallRecord } from '../../data/types';

export const ReportsPage: React.FC = () => {
  const { campaigns } = useCampaigns();
  const { callRecords } = useCallRecords();

  const [activeTab, setActiveTab] = useState<'campaigns' | 'history'>('campaigns');
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<CallRecord | null>(null);

  // Aggregates
  const totalCampaigns = campaigns.length;
  const totalCalls = callRecords.length;
  const responsesCollected = callRecords.filter(
    (c) => c.status === 'completed'
  ).length;

  // Filter campaigns
  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModule =
      moduleFilter === 'all' || c.module === moduleFilter;
    return matchesSearch && matchesModule;
  });

  // Filter calls
  const filteredCalls = callRecords.filter((c) => {
    return (
      c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Roll Number',
      'Student Name',
      'Parent Name',
      'Parent Phone (Masked)',
      'Status',
      'Duration (s)',
      'Language',
      'Summary',
    ];
    const rows = callRecords.map((r) => [
      r.rollNumber,
      `"${r.studentName}"`,
      `"${r.parentName}"`,
      `"${maskPhone(r.maskedPhone)}"`,
      r.status,
      r.durationSeconds || 0,
      'English',
      `"${(r.aiSummary || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `viit_call_records_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full flex flex-col gap-8 max-w-6xl text-left animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-eyebrow uppercase text-brand">
            Analytics & Archive
          </span>
          <h1 className="font-display text-4xl sm:text-[46px] font-bold text-ink tracking-tight mt-1">
            Reports & history.
          </h1>
          <p className="mt-1.5 text-base text-muted font-normal">
            Campaigns, conversations, and their outcomes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {callRecords.length > 0 && (
            <Button
              variant="outline"
              size="md"
              onClick={handleExportCSV}
              icon={<Download className="w-4 h-4" />}
            >
              Export data
            </Button>
          )}
          <Link to="/app/campaign/new">
            <Button
              size="md"
              className="rounded-btn font-semibold shadow-soft"
              icon={<Plus className="w-4 h-4" />}
            >
              + New campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Campaigns prepared"
          value={totalCampaigns}
          icon={<Layers className="w-4 h-4" />}
        />
        <StatCard
          title="Calls completed"
          value={totalCalls}
          icon={<PhoneCall className="w-4 h-4" />}
        />
        <StatCard
          title="Responses collected"
          value={responsesCollected}
          icon={<CheckCircle className="w-4 h-4" />}
        />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'campaigns', label: 'Campaigns', count: campaigns.length },
          { id: 'history', label: 'Call history', count: callRecords.length },
        ]}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
      />

      {/* Search & Filter Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={
              activeTab === 'campaigns'
                ? 'Search campaigns...'
                : 'Search by student or parent...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-input border border-input-border text-sm font-medium outline-none focus:border-brand focus:ring-4 focus:ring-brand-50 bg-white"
          />
        </div>

        {activeTab === 'campaigns' && (
          <div className="w-full sm:w-auto flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted" />
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="h-11 px-4 rounded-input border border-input-border text-sm font-semibold text-text-main bg-white outline-none focus:border-brand"
            >
              <option value="all">All modules</option>
              <option value="mentoring">Mentoring & attendance</option>
              <option value="feedback">Feedback</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Campaigns */}
      {activeTab === 'campaigns' && (
        <div>
          {filteredCampaigns.length === 0 ? (
            <EmptyState
              icon={<FileSpreadsheet className="w-6 h-6" />}
              title="No campaigns yet."
              description="Confirmed campaigns will appear here once submitted and verified."
              action={
                <Link to="/app/campaign/new">
                  <Button size="sm">Create campaign ↗</Button>
                </Link>
              }
            />
          ) : (
            <div className="bg-white rounded-card border border-hairline overflow-hidden shadow-soft divide-y divide-hairline">
              {filteredCampaigns.map((camp) => (
                <Link
                  key={camp.id}
                  to={`/app/campaign/monitor/${camp.id}`}
                  className="p-5 flex items-center justify-between hover:bg-page transition-colors no-underline block text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-icon-box bg-icon-box flex items-center justify-center text-ink shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-display font-bold text-base text-ink">
                        {camp.title}
                      </div>
                      <div className="text-xs text-muted mt-1 flex items-center gap-3">
                        <span>
                          {camp.department} · Year {camp.year} · Sec {camp.section}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{camp.attendanceDate || 'Today'}</span>
                        </span>
                        <span>•</span>
                        <span>{camp.totalTargetCalls || 0} queued calls</span>
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
                    <ChevronRight className="w-4 h-4 text-muted" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Call History */}
      {activeTab === 'history' && (
        <div>
          {filteredCalls.length === 0 ? (
            <EmptyState
              icon={<PhoneCall className="w-6 h-6" />}
              title="No call records yet."
              description="Completed and dispatched phone calls will be logged here."
            />
          ) : (
            <div className="bg-white rounded-card border border-hairline overflow-hidden shadow-soft">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F5F6F8] border-b border-hairline text-muted uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Roll No</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Parent</th>
                    <th className="py-3 px-4">Phone (Masked)</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {filteredCalls.map((rec) => (
                    <tr
                      key={rec.id}
                      onClick={() => setSelectedRecord(rec)}
                      className="hover:bg-page transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-ink">
                        {rec.rollNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-text-main">
                        {rec.studentName}
                      </td>
                      <td className="py-3 px-4 text-muted">{rec.parentName}</td>
                      <td className="py-3 px-4 font-mono text-muted">
                        {maskPhone(rec.maskedPhone)}
                      </td>
                      <td className="py-3 px-4 text-muted">
                        {rec.durationSeconds ? `${rec.durationSeconds}s` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={rec.status === 'completed' ? 'success' : 'neutral'}
                          dot
                        >
                          {rec.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-brand font-bold text-xs hover:underline">
                          View transcript →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Call Detail Modal */}
      <Modal
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        title="Call Conversation Record"
        subtitle={`Roll No: ${selectedRecord?.rollNumber} · ${selectedRecord?.studentName}`}
        footer={
          <Button onClick={() => setSelectedRecord(null)}>Close record</Button>
        }
      >
        {selectedRecord && (
          <div className="flex flex-col gap-4 text-xs text-left">
            <div className="grid grid-cols-2 gap-3 p-3 bg-page rounded-input">
              <div>
                <span className="text-muted block">Parent Contact</span>
                <span className="font-bold text-ink mt-0.5 block">
                  {selectedRecord.parentName} ({maskPhone(selectedRecord.maskedPhone)})
                </span>
              </div>
              <div>
                <span className="text-muted block">Duration</span>
                <span className="font-bold text-ink mt-0.5 block">
                  {selectedRecord.durationSeconds || 0}s · Completed
                </span>
              </div>
            </div>

            <div>
              <span className="font-bold text-ink block mb-1">AI Sentiment & Summary</span>
              <div className="p-3 bg-[#F9FAFB] rounded-input border border-hairline text-text-main leading-relaxed">
                {selectedRecord.aiSummary || 'Summary generated upon call completion.'}
              </div>
            </div>

            {(selectedRecord.transcriptTelugu || selectedRecord.transcriptEnglish) && (
              <div>
                <span className="font-bold text-ink block mb-1">Transcript</span>
                <div className="p-3 bg-[#F9FAFB] rounded-input border border-hairline font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto">
                  {selectedRecord.transcriptTelugu || selectedRecord.transcriptEnglish}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
