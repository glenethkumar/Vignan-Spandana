import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Clock,
  RotateCcw,
  ShieldCheck,
  FileText,
  Save,
  CheckCircle2,
  Lock,
  Search,
  Filter,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { useToast } from '../../components/common/Toast';
import { SystemSettings, ActivityLogEntry } from '../../data/types';
import { getSettings, saveSettings, listActivityLog } from '../../data/api';
import { formatDateTime } from '../../lib/utils';

export const SettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<string>('ALL');
  const [searchLog, setSearchLog] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const s = await getSettings();
    setSettings(s);
    const l = await listActivityLog();
    setLogs(l);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    try {
      await saveSettings(settings);
      showToast('System configuration saved successfully', 'success');
      loadData();
    } catch {
      showToast('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (logFilter !== 'ALL' && log.actionType !== logFilter) return false;
    if (searchLog) {
      const q = searchLog.toLowerCase();
      return (
        log.details.toLowerCase().includes(q) ||
        log.userName.toLowerCase().includes(q) ||
        log.targetEntity.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="pb-2 border-b border-border">
        <div className="text-[11px] font-bold text-brand uppercase tracking-widest mb-1">
          COLLEGE ADMINISTRATION
        </div>
        <h1 className="text-3xl font-bold text-ink-900 tracking-tight">System Settings & Activity Log</h1>
        <p className="text-sm text-ink-500 mt-1">
          Configure default calling windows, AI language defaults, privacy rules, and review comprehensive audit logs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Settings Form */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleSave} className="bg-surface rounded-card border border-border p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-ink-900">Institutional Preferences</h3>
              <Badge variant="brand" size="sm">Admin Only</Badge>
            </div>

            {/* Institution & Department */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-ink-700 uppercase mb-1">
                  Institution Name
                </label>
                <input
                  type="text"
                  value={settings?.institutionName || ''}
                  onChange={e => setSettings(prev => prev ? { ...prev, institutionName: e.target.value } : null)}
                  className="w-full p-2.5 border border-border rounded-lg bg-surface text-ink-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-700 uppercase mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={settings?.departmentName || ''}
                  onChange={e => setSettings(prev => prev ? { ...prev, departmentName: e.target.value } : null)}
                  className="w-full p-2.5 border border-border rounded-lg bg-surface text-ink-900"
                />
              </div>
            </div>

            {/* Language & Voice Defaults */}
            <div className="space-y-3 text-xs pt-3 border-t border-border">
              <div>
                <label className="block font-semibold text-ink-700 uppercase mb-1">
                  Default Speech Language
                </label>
                <select
                  value={settings?.defaultLanguage || 'Telugu'}
                  onChange={e => setSettings(prev => prev ? { ...prev, defaultLanguage: e.target.value as any } : null)}
                  className="w-full p-2.5 border border-border rounded-lg bg-surface text-ink-900"
                >
                  <option value="Telugu">Telugu (Official State Language)</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                </select>
              </div>

              {/* Confirmation Call Timing */}
              <div>
                <label className="block font-semibold text-ink-700 uppercase mb-1">
                  Confirmation Call Timing
                </label>
                <select
                  value={settings?.confirmationCallTiming || 'immediately'}
                  onChange={e => setSettings(prev => prev ? { ...prev, confirmationCallTiming: e.target.value as any } : null)}
                  className="w-full p-2.5 border border-border rounded-lg bg-surface text-ink-900"
                >
                  <option value="immediately">Immediately upon resolution (Demo Mode)</option>
                  <option value="within_hours">Within standard calling hours (09:00 - 18:00)</option>
                </select>
                <p className="text-[11px] text-ink-500 mt-1">
                  Controls when automated verification calls are queued after a grievance is marked resolved.
                </p>
              </div>

              {/* Calling Window */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-700 uppercase mb-1">
                    Calling Start
                  </label>
                  <input
                    type="time"
                    value={settings?.callingHoursStart || '09:00'}
                    onChange={e => setSettings(prev => prev ? { ...prev, callingHoursStart: e.target.value } : null)}
                    className="w-full p-2.5 border border-border rounded-lg bg-surface text-ink-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink-700 uppercase mb-1">
                    Calling End
                  </label>
                  <input
                    type="time"
                    value={settings?.callingHoursEnd || '18:00'}
                    onChange={e => setSettings(prev => prev ? { ...prev, callingHoursEnd: e.target.value } : null)}
                    className="w-full p-2.5 border border-border rounded-lg bg-surface text-ink-900"
                  />
                </div>
              </div>

              {/* Duration and Retries */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-700 uppercase mb-1">
                    Max Duration (sec)
                  </label>
                  <input
                    type="number"
                    min={60}
                    max={300}
                    value={settings?.maxCallDurationSeconds || 120}
                    onChange={e => setSettings(prev => prev ? { ...prev, maxCallDurationSeconds: Number(e.target.value) } : null)}
                    className="w-full p-2.5 border border-border rounded-lg bg-surface text-ink-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink-700 uppercase mb-1">
                    Retry Attempts
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={3}
                    value={settings?.retryAttempts || 2}
                    onChange={e => setSettings(prev => prev ? { ...prev, retryAttempts: Number(e.target.value) } : null)}
                    className="w-full p-2.5 border border-border rounded-lg bg-surface text-ink-900"
                  />
                </div>
              </div>
            </div>

            {/* Privacy Enforcement Notice */}
            <div className="p-3.5 rounded-lg bg-page border border-border space-y-1 text-xs">
              <div className="flex items-center gap-2 font-bold text-ink-900">
                <Lock className="w-3.5 h-3.5 text-brand" />
                <span>Parent Contact Privacy</span>
              </div>
              <p className="text-ink-500 text-[11px] leading-relaxed">
                Phone masking is permanently locked ON (+91 98*** **345). Full raw numbers are never exposed in exports, URLs, or browser HTML.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full gap-2"
              isLoading={isSaving}
            >
              <Save className="w-4 h-4" />
              <span>Save Institutional Settings</span>
            </Button>
          </form>
        </div>

        {/* Right Column: Activity Log Viewer */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-surface rounded-card border border-border p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-ink-900">Institutional Activity Log</h3>
                <p className="text-xs text-ink-500">Chronological audit trail of all campaign, issue, and structure events.</p>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={logFilter}
                  onChange={e => setLogFilter(e.target.value)}
                  className="py-1.5 px-2.5 border border-border rounded-lg bg-page text-ink-700"
                >
                  <option value="ALL">All Actions</option>
                  <option value="login">Logins</option>
                  <option value="upload">Uploads</option>
                  <option value="campaign_created">Campaigns</option>
                  <option value="issue_updated">Issues</option>
                  <option value="confirmation_call">Confirmation Calls</option>
                  <option value="structure_change">Structure Changes</option>
                  <option value="report_export">Exports</option>
                </select>
              </div>
            </div>

            {/* Log Entries List */}
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-ink-400">No activity log entries match the filter.</div>
              ) : (
                filteredLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-lg bg-page border border-border text-xs space-y-1 hover:border-ink-400 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink-900">{log.userName}</span>
                        <Badge variant="default" size="sm">
                          {log.userRole.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-ink-400 font-mono">
                        {formatDateTime(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-ink-700">{log.details}</p>
                    <div className="text-[10px] text-ink-400">
                      Entity: <span className="font-mono">{log.targetEntity}</span> · Action: <span className="capitalize">{log.actionType.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
