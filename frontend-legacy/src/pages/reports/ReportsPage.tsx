import React, { useState, useEffect } from 'react';
import {
  FileText,
  PhoneCall,
  Search,
  Filter,
  Download,
  Calendar,
  Layers,
  ChevronRight,
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../components/common/Toast';
import {
  Campaign,
  CallRecord,
  User,
  CampaignModule,
  CampaignStatus,
} from '../../data/types';
import {
  getActiveUser,
  listCampaigns,
  listCallHistory,
  getCallRecord,
  exportReport,
} from '../../data/api';
import { maskPhoneNumber } from '../../lib/masking';
import { formatDate, formatDateTime, formatDuration } from '../../lib/utils';
import * as XLSX from 'xlsx';
import { downloadFile } from '../../lib/excel';

export const ReportsPage: React.FC = () => {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'calls'>('campaigns');
  const [loading, setLoading] = useState(true);

  // Data lists
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Drawer / Detail modal state
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const user = await getActiveUser();
      setCurrentUser(user);

      const deptFilter = user.role === 'faculty' ? user.department : undefined;
      const [cList, callList] = await Promise.all([
        listCampaigns({ role: user.role, department: deptFilter }),
        listCallHistory({ department: deptFilter }),
      ]);

      setCampaigns(cList);
      setCalls(callList);
      setLoading(false);
    }
    loadData();
  }, []);

  // Filtered Campaigns
  const filteredCampaigns = campaigns.filter(c => {
    if (selectedDept !== 'ALL' && c.department !== selectedDept) return false;
    if (selectedModule !== 'ALL' && c.module !== selectedModule) return false;
    if (selectedStatus !== 'ALL' && c.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.section.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Calls
  const filteredCalls = calls.filter(call => {
    if (selectedStatus !== 'ALL' && call.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        call.studentName.toLowerCase().includes(q) ||
        call.rollNumber.toLowerCase().includes(q) ||
        call.parentName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Export Excel Report Handler
  const handleExport = async () => {
    if (!currentUser) return;
    try {
      const isExportCalls = activeTab === 'calls';
      const fileName = isExportCalls
        ? `VIIT_Call_Records_${new Date().toISOString().split('T')[0]}.xlsx`
        : `VIIT_Campaign_Summary_${new Date().toISOString().split('T')[0]}.xlsx`;

      let exportData: any[] = [];
      if (isExportCalls) {
        exportData = filteredCalls.map(c => ({
          'Call ID': c.id,
          'Campaign ID': c.campaignId,
          'Roll Number': c.rollNumber,
          'Student Name': c.studentName,
          'Parent Name': c.parentName,
          'Parent Phone (Masked)': maskPhoneNumber(c.maskedPhone),
          'Call Status': c.status.toUpperCase(),
          'Duration (Seconds)': c.durationSeconds,
          'Outcome': c.outcome || 'Completed',
          'AI Summary': c.aiSummary || '—',
          'Issue Linked': c.issueId ? `Issue #${c.issueId}` : 'None',
        }));
      } else {
        exportData = filteredCampaigns.map(c => ({
          'Campaign ID': c.id,
          'Title': c.title,
          'Module': c.module.toUpperCase(),
          'Department': c.department,
          'Year': `Year ${c.year}`,
          'Section': c.section,
          'Attendance Date': c.attendanceDate,
          'Upload Version': `Version ${c.uploadVersion}`,
          'Status': c.status.toUpperCase(),
          'Total Targets': c.totalTargetCalls,
          'Completed Calls': c.completedCalls,
          'Created By': c.createdBy,
          'Created At': formatDate(c.createdAt),
        }));
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, isExportCalls ? 'Call_Records' : 'Campaigns');
      const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      downloadFile(arrayBuffer, fileName);

      await exportReport(activeTab, currentUser.role);
      showToast(`Excel report exported with strictly masked phone numbers`, 'success');
    } catch {
      showToast('Failed to export report', 'error');
    }
  };

  const handleOpenCallDetail = (call: CallRecord) => {
    setSelectedCall(call);
    setIsDrawerOpen(true);
  };

  const paginatedItems = (activeTab === 'campaigns' ? filteredCampaigns : filteredCalls).slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(
    (activeTab === 'campaigns' ? filteredCampaigns.length : filteredCalls.length) / itemsPerPage
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="text-[11px] font-bold text-brand uppercase tracking-widest mb-1">
            ANALYTICS & COMPLIANCE RECORDS
          </div>
          <h1 className="text-3xl font-bold text-ink-900 tracking-tight">Reports & History</h1>
          <p className="text-sm text-ink-500 mt-1">
            Inspect past outreach performance, detailed Telugu/English transcripts, and AI grievance summaries.
          </p>
        </div>

        <Button
          variant="outline"
          size="md"
          onClick={handleExport}
          className="gap-2 shrink-0 bg-white shadow-xs"
        >
          <Download className="w-4 h-4" />
          <span>Export Excel Report</span>
        </Button>
      </div>

      {/* 3 Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 bg-surface rounded-card border border-border shadow-xs">
          <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
            Campaigns prepared
          </div>
          <div className="text-3xl font-bold font-mono text-ink-900">
            {String(campaigns.length).padStart(2, '0')}
          </div>
        </div>

        <div className="p-5 bg-surface rounded-card border border-border shadow-xs">
          <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
            Calls completed
          </div>
          <div className="text-3xl font-bold font-mono text-ink-900">
            {String(calls.filter(c => c.status === 'completed').length).padStart(2, '0')}
          </div>
        </div>

        <div className="p-5 bg-surface rounded-card border border-border shadow-xs">
          <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
            Responses collected
          </div>
          <div className="text-3xl font-bold font-mono text-ink-900">
            {String(calls.filter(c => c.status === 'completed' && c.transcriptTelugu).length).padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex items-center gap-6 border-b border-border">
        <button
          onClick={() => {
            setActiveTab('campaigns');
            setCurrentPage(1);
          }}
          className={`pb-3 text-sm flex items-center gap-2 border-b-2 transition-all relative ${
            activeTab === 'campaigns'
              ? 'border-ink-900 text-ink-900 font-bold'
              : 'border-transparent text-ink-500 hover:text-ink-900 font-medium'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Campaigns</span>
          <span className="px-2 py-0.5 rounded-full bg-page border border-border text-xs font-mono">
            {campaigns.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('calls');
            setCurrentPage(1);
          }}
          className={`pb-3 text-sm flex items-center gap-2 border-b-2 transition-all relative ${
            activeTab === 'calls'
              ? 'border-ink-900 text-ink-900 font-bold'
              : 'border-transparent text-ink-500 hover:text-ink-900 font-medium'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          <span>Call history</span>
          <span className="px-2 py-0.5 rounded-full bg-page border border-border text-xs font-mono">
            {calls.length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-surface rounded-card border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={
              activeTab === 'campaigns'
                ? 'Search campaign title or section...'
                : 'Search student name, roll number, or parent...'
            }
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-page border border-border rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {activeTab === 'campaigns' && (
            <>
              <select
                value={selectedDept}
                onChange={e => {
                  setSelectedDept(e.target.value);
                  setCurrentPage(1);
                }}
                className="py-2 px-3 border border-border rounded-lg bg-page text-ink-700"
              >
                <option value="ALL">All Departments</option>
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
              </select>

              <select
                value={selectedModule}
                onChange={e => {
                  setSelectedModule(e.target.value);
                  setCurrentPage(1);
                }}
                className="py-2 px-3 border border-border rounded-lg bg-page text-ink-700"
              >
                <option value="ALL">All Modules</option>
                <option value="mentoring">Mentoring & Attendance</option>
                <option value="feedback">Feedback Survey</option>
              </select>
            </>
          )}

          <select
            value={selectedStatus}
            onChange={e => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="py-2 px-3 border border-border rounded-lg bg-page text-ink-700"
          >
            <option value="ALL">All Statuses</option>
            {activeTab === 'campaigns' ? (
              <>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="draft">Draft</option>
              </>
            ) : (
              <>
                <option value="completed">Completed</option>
                <option value="no_answer">No Answer</option>
                <option value="failed">Failed</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-surface rounded-card border border-border shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : paginatedItems.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title={activeTab === 'campaigns' ? 'No campaigns yet' : 'No call records found'}
            description={
              activeTab === 'campaigns'
                ? 'Confirmed campaigns will appear here.'
                : 'Calls placed by active campaigns will be listed here.'
            }
          />
        ) : activeTab === 'campaigns' ? (
          /* Campaigns Tab Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-page text-ink-500 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Campaign Title</th>
                  <th className="px-5 py-3.5">Class & Section</th>
                  <th className="px-5 py-3.5">Module</th>
                  <th className="px-5 py-3.5">Attendance Date</th>
                  <th className="px-5 py-3.5">Upload Version</th>
                  <th className="px-5 py-3.5">Target & Finished</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(paginatedItems as Campaign[]).map(c => (
                  <tr key={c.id} className="hover:bg-page/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-ink-900">{c.title}</div>
                      <div className="text-[11px] text-ink-400">By {c.createdBy}</div>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-ink-900">
                      {c.department} / Year {c.year} / {c.section}
                    </td>
                    <td className="px-5 py-3.5 capitalize font-medium text-ink-700">
                      {c.module}
                    </td>
                    <td className="px-5 py-3.5 text-ink-600">
                      {formatDate(c.attendanceDate)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="brand" size="sm">
                        Version {c.uploadVersion}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      <span className="font-bold text-brand">{c.completedCalls}</span> / {c.totalTargetCalls}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={
                          c.status === 'completed'
                            ? 'success'
                            : c.status === 'in_progress'
                            ? 'brand'
                            : c.status === 'pending_approval'
                            ? 'warning'
                            : 'default'
                        }
                        size="sm"
                      >
                        {c.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => {
                          setActiveTab('calls');
                          setSearchQuery(c.section);
                        }}
                        className="text-brand font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>View Calls</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Calls Tab Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-page text-ink-500 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Roll Number</th>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-5 py-3.5">Parent Name</th>
                  <th className="px-5 py-3.5">Masked Contact</th>
                  <th className="px-5 py-3.5">Duration</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Outcome</th>
                  <th className="px-5 py-3.5">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(paginatedItems as CallRecord[]).map(call => (
                  <tr key={call.id} className="hover:bg-page/50 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-ink-900">
                      {call.rollNumber}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-ink-900">{call.studentName}</td>
                    <td className="px-5 py-3.5 text-ink-600">{call.parentName}</td>
                    <td className="px-5 py-3.5 font-mono text-ink-600">
                      {maskPhoneNumber(call.maskedPhone)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-ink-500">
                      {formatDuration(call.durationSeconds)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={call.status === 'completed' ? 'success' : 'default'}
                        size="sm"
                      >
                        {call.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-ink-800 line-clamp-1">
                        {call.outcome || 'Completed'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenCallDetail(call)}
                        className="p-1.5 text-brand"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 bg-page border-t border-border flex items-center justify-between text-xs text-ink-500">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Call Detail Drawer Modal */}
      <Modal
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={`Call Record · ${selectedCall?.studentName}`}
        description={`Roll: ${selectedCall?.rollNumber} · Duration: ${formatDuration(
          selectedCall?.durationSeconds || 0
        )}`}
        size="lg"
        footer={
          <Button variant="primary" size="sm" onClick={() => setIsDrawerOpen(false)}>
            Close Detail
          </Button>
        }
      >
        {selectedCall && (
          <div className="space-y-5 text-xs">
            {/* Contact Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-page border border-border">
              <div>
                <span className="text-ink-400">Parent / Guardian</span>
                <p className="font-bold text-ink-900 mt-0.5">{selectedCall.parentName}</p>
              </div>
              <div>
                <span className="text-ink-400">Masked Phone</span>
                <p className="font-mono font-bold text-ink-900 mt-0.5">
                  {maskPhoneNumber(selectedCall.maskedPhone)}
                </p>
              </div>
              <div>
                <span className="text-ink-400">Outcome</span>
                <p className="font-bold text-brand mt-0.5">{selectedCall.outcome || 'Success'}</p>
              </div>
            </div>

            {/* AI Summary Card */}
            <div className="p-4 rounded-lg bg-brand-50 border border-brand-100 space-y-1.5">
              <div className="flex items-center gap-2 text-brand font-bold uppercase tracking-wider text-[11px]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Automated Summary</span>
              </div>
              <p className="text-xs text-ink-800 leading-relaxed">
                {selectedCall.aiSummary || 'Parent acknowledged absence due to family leave.'}
              </p>
            </div>

            {/* Transcripts (Bilingual with speaker labels) */}
            <div className="space-y-4">
              <h4 className="font-bold text-ink-900 uppercase tracking-wider text-[11px]">
                Full Audio Transcript
              </h4>

              {selectedCall.transcriptTelugu && (
                <div className="p-3.5 bg-surface rounded-lg border border-border space-y-1.5">
                  <span className="text-[11px] font-bold text-brand uppercase">
                    Telugu Audio Stream
                  </span>
                  <pre className="whitespace-pre-wrap font-sans text-xs text-ink-800 leading-relaxed">
                    {selectedCall.transcriptTelugu}
                  </pre>
                </div>
              )}

              {selectedCall.transcriptEnglish && (
                <div className="p-3.5 bg-surface rounded-lg border border-border space-y-1.5">
                  <span className="text-[11px] font-bold text-ink-600 uppercase">
                    English Translation Stream
                  </span>
                  <pre className="whitespace-pre-wrap font-sans text-xs text-ink-800 leading-relaxed">
                    {selectedCall.transcriptEnglish}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
