import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PhoneCall,
  Play,
  Pause,
  Square,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Banner } from '../../components/common/Banner';
import { useCampaigns, useCallRecords, useAuth } from '../../data/api';
import { maskPhone } from '../../lib/masking';
import { Campaign, CallRecord } from '../../data/types';

export const LiveMonitorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { campaigns, updateCampaignStatus } = useCampaigns();
  const { callRecords } = useCallRecords();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const campaignId = id ? parseInt(id, 10) : undefined;
  const campaign: Campaign | undefined = campaigns.find((c: Campaign) => c.id === campaignId) || campaigns[0];

  const role = currentUser?.role || 'admin';
  const isAdminOrPrincipal = role === 'admin' || role === 'principal';

  const [status, setStatus] = useState<string>(campaign?.status || 'ready');
  const [activeCallCount, setActiveCallCount] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(
    campaign?.completedCalls || 0
  );

  useEffect(() => {
    if (status === 'in_progress') {
      setActiveCallCount(2);
      const interval = setInterval(() => {
        setCompletedCount((c) => {
          if (campaign && c >= (campaign.totalTargetCalls || 5)) {
            setStatus('completed');
            setActiveCallCount(0);
            return c;
          }
          return c + 1;
        });
      }, 3500);
      return () => clearInterval(interval);
    } else {
      setActiveCallCount(0);
    }
  }, [status, campaign]);

  const handleStart = () => {
    setStatus('in_progress');
    if (campaign) updateCampaignStatus(campaign.id, 'in_progress');
  };

  const handlePause = () => {
    setStatus('paused');
    if (campaign) updateCampaignStatus(campaign.id, 'paused');
  };

  const handleStop = () => {
    setStatus('completed');
    if (campaign) updateCampaignStatus(campaign.id, 'completed');
  };

  const relevantCalls = callRecords.filter(
    (c: CallRecord) => !campaign || c.campaignId === campaign.id || true
  );

  return (
    <div className="w-full flex flex-col gap-8 max-w-5xl text-left animate-fade-up">
      {/* Top Banner: Calling Service (Demo) */}
      <Banner variant="info">
        <span className="font-bold">Calling service (demo mode):</span> Real phone dispatch is safely simulated for validation and role review.
      </Banner>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline">
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/app/reports')}
            icon={<ArrowLeft className="w-4 h-4" />}
            iconPosition="left"
          >
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                {campaign?.title || 'Live Campaign Monitor'}
              </h1>
              <Badge
                variant={
                  status === 'in_progress'
                    ? 'brand'
                    : status === 'completed'
                    ? 'success'
                    : 'neutral'
                }
                dot
              >
                {status}
              </Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              {campaign?.department} · Year {campaign?.year} · Section {campaign?.section}
            </p>
          </div>
        </div>

        {/* Action Controls (Admin / Principal only) */}
        {isAdminOrPrincipal && (
          <div className="flex items-center gap-2">
            {status === 'ready' || status === 'paused' || status === 'pending_approval' ? (
              <Button
                size="sm"
                onClick={handleStart}
                className="bg-ink shadow-soft"
                icon={<Play className="w-3.5 h-3.5" />}
              >
                {status === 'paused' ? 'Resume' : 'Start calls'}
              </Button>
            ) : status === 'in_progress' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePause}
                icon={<Pause className="w-3.5 h-3.5" />}
              >
                Pause
              </Button>
            ) : null}

            {status === 'in_progress' && (
              <Button
                size="sm"
                variant="danger"
                onClick={handleStop}
                icon={<Square className="w-3.5 h-3.5" />}
              >
                Stop
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Live Audio Visualizer Card */}
      <div className="p-8 bg-white rounded-card border border-hairline shadow-soft flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center text-brand mb-4">
          <PhoneCall className="w-8 h-8" />
        </div>

        <h3 className="font-display text-xl font-bold text-ink">
          {status === 'in_progress'
            ? 'Active Calling Dispatch'
            : status === 'completed'
            ? 'Campaign Finished'
            : 'Ready for Dispatch'}
        </h3>
        <p className="text-xs text-muted mt-1 max-w-sm">
          {status === 'in_progress'
            ? `Simultaneously handling ${activeCallCount} parent calls with live transcript streaming.`
            : 'All queued student contacts processed.'}
        </p>

        {/* Live Audio Wave Graphic */}
        {status === 'in_progress' && (
          <div className="flex items-center gap-2 h-10 my-6">
            <span className="w-1.5 h-4 bg-brand rounded-full wave-bar-1" />
            <span className="w-1.5 h-8 bg-brand rounded-full wave-bar-2" />
            <span className="w-1.5 h-10 bg-brand rounded-full wave-bar-3" />
            <span className="w-1.5 h-6 bg-brand rounded-full wave-bar-4" />
            <span className="w-1.5 h-9 bg-brand rounded-full wave-bar-5" />
            <span className="w-1.5 h-5 bg-brand rounded-full wave-bar-2" />
            <span className="w-1.5 h-7 bg-brand rounded-full wave-bar-1" />
          </div>
        )}

        {/* Metric Counters */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-md mt-6 pt-6 border-t border-hairline text-center">
          <div>
            <span className="text-xs text-muted block">In Progress</span>
            <span className="font-display text-2xl font-bold text-brand mt-0.5 block">
              {activeCallCount}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted block">Completed</span>
            <span className="font-display text-2xl font-bold text-emerald-600 mt-0.5 block">
              {completedCount}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted block">Total Queued</span>
            <span className="font-display text-2xl font-bold text-ink mt-0.5 block">
              {campaign?.totalTargetCalls || 5}
            </span>
          </div>
        </div>
      </div>

      {/* Dispatched Calls Table with Masked Phones */}
      <div className="flex flex-col gap-3">
        <h3 className="font-display text-lg font-bold text-ink">
          Live Call Feed
        </h3>
        <div className="bg-white rounded-card border border-hairline overflow-hidden shadow-soft">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F5F6F8] border-b border-hairline text-muted uppercase font-bold text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Roll No</th>
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-3">Parent Name</th>
                <th className="py-2.5 px-3">Phone (Masked)</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {relevantCalls.slice(0, 8).map((rec: CallRecord) => (
                <tr key={rec.id} className="hover:bg-page">
                  <td className="py-2.5 px-3 font-mono font-bold text-ink">
                    {rec.rollNumber}
                  </td>
                  <td className="py-2.5 px-3 font-semibold">{rec.studentName}</td>
                  <td className="py-2.5 px-3 text-muted">{rec.parentName}</td>
                  <td className="py-2.5 px-3 font-mono text-muted">
                    {maskPhone(rec.maskedPhone)}
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge variant={rec.status === 'completed' ? 'success' : 'neutral'} dot>
                      {rec.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
