import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../services/auth-context';
import { api } from '../../services/api-client';
import {
  Clock,
  Filter,
  FileText,
  Pill,
  HeartPulse,
  Activity,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface TimelineEntry {
  id: string;
  type: 'DOCUMENT' | 'PRESCRIPTION' | 'TREATMENT' | 'MEDICATION_EVENT' | 'SYMPTOM' | 'HEALTH_SUMMARY';
  provenance: 'DOCTOR_PRESCRIBED' | 'PATIENT_REPORTED' | 'AI_EXTRACTED_DRAFT' | 'SYSTEM_GENERATED';
  title: string;
  subtitle?: string | null;
  timestamp: string;
  isApproximateTime: boolean;
  category?: string | null;
  status?: string | null;
  details: Record<string, unknown>;
}

export const TimelinePage: React.FC = () => {
  const { activeProfile } = useAuth();
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [provenanceFilter, setProvenanceFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadTimeline = useCallback(async () => {
    if (!activeProfile) return;
    setIsLoading(true);
    try {
      const data = await api.get<TimelineEntry[]>('/api/v1/timeline', {
        patientProfileId: activeProfile.id,
        provenance: provenanceFilter || undefined,
        type: typeFilter || undefined,
      });
      setTimeline(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile, provenanceFilter, typeFilter]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  if (!activeProfile) return null;

  const getProvenanceBadge = (provenance: TimelineEntry['provenance']) => {
    switch (provenance) {
      case 'DOCTOR_PRESCRIBED':
        return <span className="badge badge-prescribed text-[10px]">Doctor Prescribed</span>;
      case 'PATIENT_REPORTED':
        return <span className="badge badge-reported text-[10px]">Patient Reported</span>;
      case 'AI_EXTRACTED_DRAFT':
        return <span className="badge badge-extracted text-[10px]">AI / OCR Draft</span>;
      case 'SYSTEM_GENERATED':
        return <span className="badge badge-system text-[10px]">System Generated</span>;
    }
  };

  const getIcon = (type: TimelineEntry['type']) => {
    switch (type) {
      case 'DOCUMENT':
        return <FileText className="w-4 h-4 text-sky-600" />;
      case 'PRESCRIPTION':
        return <Pill className="w-4 h-4 text-sky-700" />;
      case 'TREATMENT':
        return <HeartPulse className="w-4 h-4 text-emerald-600" />;
      case 'MEDICATION_EVENT':
        return <CheckCircle2 className="w-4 h-4 text-emerald-700" />;
      case 'SYMPTOM':
        return <Activity className="w-4 h-4 text-amber-600" />;
      case 'HEALTH_SUMMARY':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Source-Aware Medical Timeline</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Unified chronological history distinguishing doctor orders, patient reality, and draft extractions.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Filter Provenance:</span>
        </div>

        <select
          value={provenanceFilter}
          onChange={(e) => setProvenanceFilter(e.target.value)}
          className="input-field text-xs py-1.5 w-auto"
        >
          <option value="">All Provenance Types</option>
          <option value="DOCTOR_PRESCRIBED">Doctor Prescribed</option>
          <option value="PATIENT_REPORTED">Patient Reported Reality</option>
          <option value="AI_EXTRACTED_DRAFT">AI / OCR Draft Extractions</option>
          <option value="SYSTEM_GENERATED">System Calculations / Summaries</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input-field text-xs py-1.5 w-auto"
        >
          <option value="">All Categories</option>
          <option value="MEDICATION_EVENT">Medication Events</option>
          <option value="PRESCRIPTION">Prescriptions</option>
          <option value="DOCUMENT">Documents</option>
          <option value="SYMPTOM">Symptoms</option>
        </select>
      </div>

      {/* Timeline Stream */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading timeline events...</div>
      ) : timeline.length === 0 ? (
        <div className="card p-12 text-center space-y-2">
          <Clock className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs text-slate-500">No events found matching your filter criteria.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 py-2">
          {timeline.map((entry) => (
            <div key={entry.id} className="relative pl-6">
              {/* Timeline marker icon */}
              <div className="absolute -left-[17px] top-1.5 w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-xs">
                {getIcon(entry.type)}
              </div>

              {/* Entry Card */}
              <div className="card p-4 hover:border-slate-300 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-100 mb-2">
                  <div className="flex items-center gap-2">
                    {getProvenanceBadge(entry.provenance)}
                    <span className="text-[11px] text-slate-400">
                      {new Date(entry.timestamp).toLocaleDateString()} at{' '}
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {entry.isApproximateTime && ' (Approximate)'}
                    </span>
                  </div>
                  {entry.status && <span className="badge bg-slate-100 text-slate-700 text-[10px]">{entry.status}</span>}
                </div>

                <h4 className="text-sm font-bold text-slate-900">{entry.title}</h4>
                {entry.subtitle && <p className="text-xs text-slate-600 mt-0.5">{entry.subtitle}</p>}

                {entry.details.correctionNotes ? (
                  <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded-md mt-2">
                    Correction reason: {String(entry.details.correctionNotes)}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
