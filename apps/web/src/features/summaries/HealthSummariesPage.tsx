import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../services/auth-context';
import { api } from '../../services/api-client';
import {
  FileText,
  Sparkles,
} from 'lucide-react';

export const HealthSummariesPage: React.FC = () => {
  const { activeProfile } = useAuth();
  const [summaries, setSummaries] = useState<Array<{
    id: string;
    summaryType: 'PATIENT' | 'CLINICIAN';
    title: string;
    contentMarkdown: string;
    createdAt: string;
  }>>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<'PATIENT' | 'CLINICIAN'>('PATIENT');
  const [activeSummary, setActiveSummary] = useState<(typeof summaries)[0] | null>(null);

  const loadSummaries = useCallback(async () => {
    if (!activeProfile) return;
    setIsLoading(true);
    try {
      const data = await api.get<typeof summaries>('/api/v1/summaries', {
        patientProfileId: activeProfile.id,
      });
      setSummaries(data);
      if (data.length > 0) setActiveSummary(data[0]!);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  const handleGenerate = async () => {
    if (!activeProfile) return;
    setIsGenerating(true);
    try {
      const created = await api.post<(typeof summaries)[0]>('/api/v1/summaries/generate', {
        patientProfileId: activeProfile.id,
        summaryType: selectedType,
      });
      setActiveSummary(created);
      loadSummaries();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!activeProfile) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Traceable Health Summaries</h2>
            <span className="badge bg-purple-100 text-purple-800 text-[10px]">Phase 2</span>
          </div>
          <p className="text-xs text-slate-500">
            Synthesized strictly from confirmed structured prescriptions and patient-reported actual events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as 'PATIENT' | 'CLINICIAN')}
            className="input-field text-xs py-1.5 w-auto"
          >
            <option value="PATIENT">Patient Summary View</option>
            <option value="CLINICIAN">Clinician Structured View</option>
          </select>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn-primary text-xs py-2 px-3 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? 'Synthesizing...' : 'Generate New Summary'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Summary History List */}
        <div className="card p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Generated Summaries</h3>
          {isLoading ? (
            <p className="text-xs text-slate-400 py-4 text-center">Loading summaries...</p>
          ) : summaries.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No summaries generated yet.</p>
          ) : (
            <div className="space-y-2">
              {summaries.map((s) => {
                const isSelected = activeSummary?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSummary(s)}
                    className={`w-full text-left p-3 rounded-lg border transition-all text-xs ${
                      isSelected
                        ? 'bg-sky-50 border-sky-300 text-sky-900 font-semibold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="badge text-[10px] bg-white border border-slate-200">
                        {s.summaryType === 'PATIENT' ? 'Patient' : 'Clinician'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="truncate">{s.title}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Summary Viewport */}
        <div className="md:col-span-2 card p-6 bg-white space-y-4">
          {activeSummary ? (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-base font-bold text-slate-900">{activeSummary.title}</h3>
                <span className="text-xs text-slate-400">
                  {new Date(activeSummary.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-[600px] overflow-y-auto">
                {activeSummary.contentMarkdown}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Select a summary from the list or click Generate above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
