import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../services/auth-context';
import { api } from '../../services/api-client';
import {
  Download,
  FileText,
  FileCode,
} from 'lucide-react';

export const ExportsPage: React.FC = () => {
  const { activeProfile } = useAuth();
  const [jobs, setJobs] = useState<Array<{
    id: string;
    format: 'PDF' | 'JSON' | 'FHIR_R4';
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    createdAt: string;
    completedAt?: string | null;
    errorMessage?: string | null;
  }>>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState<'PDF' | 'JSON'>('PDF');

  const loadJobs = useCallback(async () => {
    if (!activeProfile) return;
    setIsLoading(true);
    try {
      const data = await api.get<typeof jobs>('/api/v1/exports', {
        patientProfileId: activeProfile.id,
      });
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleCreateExport = async () => {
    if (!activeProfile) return;
    setIsExporting(true);
    try {
      await api.post('/api/v1/exports', {
        patientProfileId: activeProfile.id,
        format,
      });
      loadJobs();
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!activeProfile) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Export & Interoperability</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate full portable medical wallet exports in human-readable PDF or canonical machine-readable JSON.
        </p>
      </div>

      {/* Export Action Card */}
      <div className="card p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Create New Wallet Export</h3>
        <p className="text-xs text-slate-600">
          Exports contain your patient demographics, confirmed prescriptions, active treatment courses, and actual patient-reported medication events with full historical provenance.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-semibold text-slate-700">Format:</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'PDF' | 'JSON')}
              className="input-field text-xs py-2 w-full sm:w-48"
            >
              <option value="PDF">PDF Medical Wallet Report</option>
              <option value="JSON">Prescriptionly JSON (v1.0.0)</option>
            </select>
          </div>

          <button
            onClick={handleCreateExport}
            disabled={isExporting}
            className="btn-primary text-xs py-2 px-4 shadow-sm w-full sm:w-auto"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Generating...' : `Generate ${format} Export`}
          </button>
        </div>
      </div>

      {/* Export History */}
      <div className="card p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Export History</h3>

        {isLoading ? (
          <p className="text-xs text-slate-400 py-6 text-center">Loading export history...</p>
        ) : jobs.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No export jobs generated yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {jobs.map((job) => (
              <div key={job.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  {job.format === 'JSON' ? (
                    <FileCode className="w-5 h-5 text-purple-600" />
                  ) : (
                    <FileText className="w-5 h-5 text-red-600" />
                  )}
                  <div>
                    <span className="font-bold text-slate-900">{job.format} Export</span>
                    <span className="text-slate-400 ml-2 text-[11px]">
                      {new Date(job.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {job.status === 'COMPLETED' ? (
                    <a
                      href={`/api/v1/exports/${job.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary text-xs py-1 px-3 text-sky-700 hover:bg-sky-50 font-medium flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download File
                    </a>
                  ) : job.status === 'FAILED' ? (
                    <span className="badge bg-red-50 text-red-700 border-red-200 text-[10px]">Failed</span>
                  ) : (
                    <span className="badge bg-slate-100 text-slate-600 text-[10px]">Processing...</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
