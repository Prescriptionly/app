import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api-client';
import {
  RefreshCw,
  Activity,
  FileText,
  Users,
  Pill,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [metrics, setMetrics] = useState<{
    accounts: number;
    documents: number;
    prescriptions: number;
    events: number;
    queue: { pending: number; failed: number };
    activeAiConfig?: {
      provider: 'GEMINI' | 'OPENAI' | 'AGENTROUTER' | 'MOCK';
      model: string;
      baseURL?: string;
      isActive: boolean;
      hasApiKey: boolean;
      statusDescription: string;
    };
    systemHealth: string;
    timestamp: string;
  } | null>(null);

  const [jobs, setJobs] = useState<Array<{
    id: string;
    jobType: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    attempts: number;
    maxAttempts: number;
    scheduledAt: string;
    lastError?: string | null;
    createdAt: string;
  }>>([]);

  const [isLoading, setIsLoading] = useState(true);

  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [m, j] = await Promise.all([
        api.get<typeof metrics>('/api/v1/admin/metrics'),
        api.get<typeof jobs>('/api/v1/admin/jobs'),
      ]);
      setMetrics(m);
      setJobs(j);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleRetryJob = async (jobId: string) => {
    try {
      await api.post(`/api/v1/admin/jobs/${jobId}/retry`);
      loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-xs">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Privacy-Preserving Operational Ops</h2>
            <span className="badge bg-slate-900 text-white text-[10px]">Least Privilege Scoped</span>
          </div>
          <p className="text-slate-500">
            Monitor system queue health, worker status, and retry failed operations without accessing sensitive patient medical records.
          </p>
        </div>

        <button onClick={loadAdminData} className="btn-secondary text-xs py-1.5 px-3">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Accounts</p>
              <h3 className="text-lg font-bold text-slate-900">{metrics.accounts}</h3>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Documents</p>
              <h3 className="text-lg font-bold text-slate-900">{metrics.documents}</h3>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Prescriptions</p>
              <h3 className="text-lg font-bold text-slate-900">{metrics.prescriptions}</h3>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Queue Pending</p>
              <h3 className="text-lg font-bold text-slate-900">{metrics.queue.pending}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Active AI / OCR Configuration */}
      {metrics?.activeAiConfig && (
        <div className="card p-5 space-y-3 bg-gradient-to-r from-slate-900 to-sky-950 text-white border-0 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white">Active AI Engine & Extraction Model</h3>
            </div>
            <span
              className={`badge text-[10px] ${
                metrics.activeAiConfig.isActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
              }`}
            >
              {metrics.activeAiConfig.isActive ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> LIVE {metrics.activeAiConfig.provider} ACTIVE
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-400" /> LOCAL FALLBACK (DEACTIVATED)
                </span>
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Provider</p>
              <p className="text-sm font-bold text-sky-300 mt-0.5">{metrics.activeAiConfig.provider}</p>
            </div>

            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Selected Model (AI_MODEL)</p>
              <p className="text-sm font-bold text-white font-mono mt-0.5">{metrics.activeAiConfig.model}</p>
            </div>

            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">API Key (AI_API_KEY)</p>
              <p className="text-xs font-semibold text-slate-300 mt-0.5">
                {metrics.activeAiConfig.hasApiKey ? 'Configured (Encrypted)' : 'Not Configured (Safe Offline Mode)'}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 font-medium">
            Status: <span className="text-slate-100">{metrics.activeAiConfig.statusDescription}</span>
          </p>

          <div className="p-3 rounded-lg bg-black/30 border border-white/10 text-[11px] font-mono text-slate-300 space-y-1">
            <p className="text-slate-400 font-sans font-semibold">Switch model / activate live AI via `.env`:</p>
            <p className="text-sky-300">AI_API_KEY=your_token_or_key</p>
            <p className="text-emerald-300">AI_MODEL=gemini-1.5-flash <span className="text-slate-400"># or gpt-4o, claude-3-5-sonnet, deepseek-chat</span></p>
            <p className="text-purple-300">AI_BASE_URL=https://agentrouter.org/v1 <span className="text-slate-400"># (Optional: for AgentRouter gateway)</span></p>
          </div>
        </div>
      )}

      {/* Background Jobs Queue */}
      <div className="card p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
          Background Worker Jobs ({jobs.length})
        </h3>

        {isLoading ? (
          <p className="text-xs text-slate-400 py-6 text-center">Loading jobs...</p>
        ) : jobs.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No background jobs found.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {jobs.map((job) => (
              <div key={job.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{job.jobType}</span>
                    <span
                      className={`badge text-[10px] ${
                        job.status === 'COMPLETED'
                          ? 'badge-reported'
                          : job.status === 'FAILED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {job.status}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Attempts: {job.attempts}/{job.maxAttempts}
                    </span>
                  </div>

                  {job.lastError && (
                    <p className="text-red-600 bg-red-50 p-2 rounded text-[11px] mt-1 font-mono">
                      Error: {job.lastError}
                    </p>
                  )}

                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Created: {new Date(job.createdAt).toLocaleString()}
                  </p>
                </div>

                {job.status === 'FAILED' && (
                  <button
                    onClick={() => handleRetryJob(job.id)}
                    className="btn-secondary text-[11px] py-1 px-3 text-sky-700 hover:bg-sky-50"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry Job
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
