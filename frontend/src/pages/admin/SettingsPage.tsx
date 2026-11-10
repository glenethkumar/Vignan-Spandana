import React, { useState } from 'react';
import {
  Clock,
  RotateCcw,
  Shield,
  Activity,
  CheckCircle,
  Save,
  PhoneCall,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Banner } from '../../components/common/Banner';
import { useToast } from '../../components/common/Toast';

export const SettingsPage: React.FC = () => {
  const { showToast } = useToast();

  const [callingWindow, setCallingWindow] = useState('09:00 - 18:00');
  const [maxRetries, setMaxRetries] = useState(1);
  const [confirmationTiming, setConfirmationTiming] = useState<'immediately' | 'within_hours'>(
    'within_hours'
  );

  const handleSave = () => {
    showToast('System configuration saved successfully', 'success');
  };

  const auditLogs = [
    { id: 1, action: 'Campaign Created', details: 'CSE Year 3 Section F Attendance', time: '10 mins ago', user: 'Admin Staff' },
    { id: 2, action: 'Issue Resolved', details: 'Hostel Hot Water Supply Disruption', time: '1 hour ago', user: 'Hostel Dean' },
    { id: 3, action: 'Upload Validated', details: '60 student records processed without errors', time: '2 hours ago', user: 'Faculty User' },
    { id: 4, action: 'Parent Confirmed', details: 'Grievance verification call closed successfully', time: 'Yesterday', user: 'Automated System' },
  ];

  return (
    <div className="w-full flex flex-col gap-8 max-w-5xl text-left animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline">
        <div>
          <span className="text-[11px] font-bold tracking-eyebrow uppercase text-brand">
            System Preferences
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight mt-1">
            Calling & Governance Settings
          </h1>
          <p className="mt-1 text-sm text-muted font-normal">
            Manage dispatch parameters, parent confirmation loops, and system activity logs.
          </p>
        </div>

        <Button
          size="md"
          onClick={handleSave}
          className="rounded-btn shadow-soft"
          icon={<Save className="w-4 h-4" />}
        >
          Save preferences
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Calling Parameters */}
        <div className="p-6 bg-white rounded-card border border-hairline shadow-soft flex flex-col gap-5">
          <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand" />
            <span>Calling Hours & Dispatch</span>
          </h3>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-main">
              Permitted Calling Window
            </label>
            <input
              value={callingWindow}
              onChange={(e) => setCallingWindow(e.target.value)}
              className="w-full h-11 px-3.5 rounded-input border border-input-border text-sm font-medium"
            />
            <span className="text-[11px] text-muted">
              Calls are automatically queued outside this time window.
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-main">
              Maximum Unanswered Retries
            </label>
            <select
              value={maxRetries}
              onChange={(e) => setMaxRetries(Number(e.target.value))}
              className="w-full h-11 px-3.5 rounded-input border border-input-border text-sm font-medium bg-white"
            >
              <option value={0}>0 (No retry)</option>
              <option value={1}>1 retry after 30 minutes</option>
              <option value={2}>2 retries spaced across the day</option>
            </select>
          </div>
        </div>

        {/* Issue Follow-up Timing */}
        <div className="p-6 bg-white rounded-card border border-hairline shadow-soft flex flex-col gap-5">
          <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-issue-icon" />
            <span>Confirmation Call Timing</span>
          </h3>

          <p className="text-xs text-muted leading-relaxed">
            When a staff member marks an issue as "Resolved", an automated follow-up call is placed to the parent to confirm resolution.
          </p>

          <div className="flex flex-col gap-2.5">
            <label
              onClick={() => setConfirmationTiming('within_hours')}
              className={`p-3.5 rounded-input border cursor-pointer flex items-center justify-between transition-all ${
                confirmationTiming === 'within_hours'
                  ? 'bg-brand-50 border-brand text-brand-dark font-bold'
                  : 'bg-white border-hairline text-muted font-medium hover:border-neutral-300'
              }`}
            >
              <div className="text-xs">
                <div className="font-bold text-ink">Within calling hours (Recommended)</div>
                <div className="text-[11px] text-muted mt-0.5">
                  Only dispatch follow-up confirmation calls between 09:00 and 18:00
                </div>
              </div>
              <input
                type="radio"
                checked={confirmationTiming === 'within_hours'}
                onChange={() => setConfirmationTiming('within_hours')}
                className="text-brand focus:ring-brand"
              />
            </label>

            <label
              onClick={() => setConfirmationTiming('immediately')}
              className={`p-3.5 rounded-input border cursor-pointer flex items-center justify-between transition-all ${
                confirmationTiming === 'immediately'
                  ? 'bg-brand-50 border-brand text-brand-dark font-bold'
                  : 'bg-white border-hairline text-muted font-medium hover:border-neutral-300'
              }`}
            >
              <div className="text-xs">
                <div className="font-bold text-ink">Immediately upon resolution</div>
                <div className="text-[11px] text-muted mt-0.5">
                  Place confirmation call immediately regardless of time
                </div>
              </div>
              <input
                type="radio"
                checked={confirmationTiming === 'immediately'}
                onChange={() => setConfirmationTiming('immediately')}
                className="text-brand focus:ring-brand"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Audit Log Trail */}
      <div className="flex flex-col gap-3">
        <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
          <Activity className="w-5 h-5 text-muted" />
          <span>System Activity & Audit Log</span>
        </h3>

        <div className="bg-white rounded-card border border-hairline overflow-hidden shadow-soft">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F5F6F8] border-b border-hairline text-muted uppercase font-bold text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Event Action</th>
                <th className="py-2.5 px-4">Details</th>
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-page">
                  <td className="py-3 px-4 font-bold text-ink">{log.action}</td>
                  <td className="py-3 px-4 text-muted">{log.details}</td>
                  <td className="py-3 px-4 font-semibold text-text-main">{log.user}</td>
                  <td className="py-3 px-4 text-right text-muted">{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

