import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../services/auth-context';
import { api } from '../../services/api-client';
import { LogEventModal } from '../events/LogEventModal';
import {
  Pill,
  FileText,
  Clock,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Upload,
  ArrowRight,
  Sparkles,
  Download,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { activeProfile } = useAuth();
  const [prescribedVsActual, setPrescribedVsActual] = useState<{
    prescribedCount: number;
    loggedEventsCount: number;
    prescribedItems: Array<{
      treatmentId: string;
      medicationName: string;
      form: string;
      prescribedDailyDose: string;
      isPrn: boolean;
      instructionText: string;
    }>;
    actualEvents: Array<{
      id: string;
      medicationName: string;
      action: string;
      quantity: number;
      unit: string;
      eventTimestamp: string;
      isApproximateTime: boolean;
    }>;
  } | null>(null);

  const [recentDocs, setRecentDocs] = useState<Array<{
    id: string;
    title: string;
    category: string;
    createdAt: string;
    versions: Array<{ extractions: Array<{ id: string; status: string; isConfirmed: boolean }> }>;
  }>>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedMedForLog, setSelectedMedForLog] = useState<{
    treatmentId?: string;
    name?: string;
    form?: string;
  }>({});

  const loadDashboardData = useCallback(async () => {
    if (!activeProfile) return;
    setIsLoading(true);
    try {
      const [pvaRes, docsRes] = await Promise.all([
        api.get<typeof prescribedVsActual>('/api/v1/medication-events/prescribed-vs-actual', {
          patientProfileId: activeProfile.id,
        }),
        api.get<typeof recentDocs>('/api/v1/documents', {
          patientProfileId: activeProfile.id,
        }),
      ]);
      setPrescribedVsActual(pvaRes);
      setRecentDocs(docsRes.slice(0, 5));
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (!activeProfile) return null;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-sky-700 to-sky-900 rounded-2xl p-6 text-white shadow-sm">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/30 text-sky-100 border border-sky-400/30 mb-2">
            Active Patient: {activeProfile.displayName}
          </span>
          <h2 className="text-2xl font-bold tracking-tight">Today's Medication Wallet</h2>
          <p className="text-sky-100 text-xs md:text-sm mt-1 max-w-xl">
            Prescriptions reflect doctor orders. Medication events reflect what you actually took. Neither overwrites the other.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => {
              setSelectedMedForLog({});
              setLogModalOpen(true);
            }}
            className="btn-primary bg-white text-sky-800 hover:bg-sky-50 font-semibold text-xs shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Log Dose Taken / Skipped
          </button>
          <Link
            to="/documents"
            className="btn-secondary bg-sky-800/60 hover:bg-sky-800 text-white border-sky-600 font-semibold text-xs"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </Link>
        </div>
      </div>

      {/* Overview Stat Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Regimens</p>
            <h3 className="text-xl font-bold text-slate-900">{prescribedVsActual?.prescribedCount || 0}</h3>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Today's Logged Doses</p>
            <h3 className="text-xl font-bold text-slate-900">{prescribedVsActual?.loggedEventsCount || 0}</h3>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Documents on File</p>
            <h3 className="text-xl font-bold text-slate-900">{recentDocs.length}</h3>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Timezone</p>
            <h3 className="text-sm font-bold text-slate-900 truncate">{activeProfile.timezone}</h3>
          </div>
        </div>
      </div>

      {/* Main Prescribed vs Actual Today Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prescribed Treatments & Today's Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">Today's Prescribed Regimen vs Actual Log</h3>
              </div>
              <Link to="/treatments" className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading today's schedule...</div>
            ) : !prescribedVsActual?.prescribedItems || prescribedVsActual.prescribedItems.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-xs text-slate-500">No active prescribed treatments recorded yet.</p>
                <div className="flex justify-center gap-2">
                  <Link to="/documents" className="btn-primary text-xs py-1.5 px-3">
                    Upload Doctor Prescription
                  </Link>
                  <Link to="/prescriptions/new" className="btn-secondary text-xs py-1.5 px-3">
                    Enter Manually
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-2">
                {prescribedVsActual.prescribedItems.map((item) => (
                  <div key={item.treatmentId} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{item.medicationName}</h4>
                        <span className="badge badge-prescribed text-[10px]">{item.form}</span>
                        {item.isPrn && (
                          <span className="badge bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                            As Needed (PRN)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 font-medium">{item.prescribedDailyDose}</p>
                      <p className="text-[11px] text-slate-400 italic mt-0.5">"{item.instructionText}"</p>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedMedForLog({
                          treatmentId: item.treatmentId,
                          name: item.medicationName,
                          form: item.form,
                        });
                        setLogModalOpen(true);
                      }}
                      className="btn-secondary text-xs py-1.5 px-3 self-start sm:self-auto border-sky-200 text-sky-700 hover:bg-sky-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Log Event
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Logged Medication Reality */}
          <div className="card p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Today's Reported Medication Events</h3>
              </div>
              <Link to="/timeline" className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1">
                Full Timeline <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {!prescribedVsActual?.actualEvents || prescribedVsActual.actualEvents.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No doses logged for today yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 mt-2">
                {prescribedVsActual.actualEvents.map((event) => (
                  <div key={event.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`badge text-[10px] ${
                          event.action === 'TAKEN'
                            ? 'badge-reported'
                            : event.action === 'SKIPPED'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'badge-system'
                        }`}
                      >
                        {event.action}
                      </span>
                      <div>
                        <span className="font-semibold text-slate-900">{event.medicationName}</span>
                        <span className="text-slate-500 ml-1.5">
                          ({event.quantity} {event.unit})
                        </span>
                      </div>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {new Date(event.eventTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {event.isApproximateTime && ' ~'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Recent Vault Uploads & Quick Tools */}
        <div className="space-y-4">
          {/* Document Vault Highlights */}
          <div className="card p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">Recent Documents</h3>
              </div>
              <Link to="/documents" className="text-xs font-semibold text-sky-600 hover:text-sky-700">
                Vault
              </Link>
            </div>

            {recentDocs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No documents uploaded.</p>
            ) : (
              <div className="divide-y divide-slate-100 mt-2">
                {recentDocs.map((doc) => {
                  const ext = doc.versions[0]?.extractions[0];
                  return (
                    <div key={doc.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="truncate pr-2">
                        <Link to={`/documents/${doc.id}`} className="font-medium text-slate-900 hover:text-sky-600 truncate block">
                          {doc.title}
                        </Link>
                        <span className="text-[10px] text-slate-400 uppercase">{doc.category}</span>
                      </div>
                      {ext && !ext.isConfirmed && ext.status === 'EXTRACTED' ? (
                        <Link
                          to={`/ocr/review/${ext.id}`}
                          className="btn-primary text-[10px] py-1 px-2 bg-amber-600 hover:bg-amber-700"
                        >
                          Review Draft
                        </Link>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Wallet Actions */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Wallet Actions</h3>
            <div className="space-y-2 text-xs">
              <Link to="/prescriptions/new" className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                <Pill className="w-4 h-4 text-sky-600" />
                <span className="font-medium text-slate-700">Add Manual Prescription</span>
              </Link>
              <Link to="/summaries" className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-slate-700">Generate Health Summary</span>
              </Link>
              <Link to="/exports" className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                <Download className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-slate-700">Download PDF/JSON Export</span>
              </Link>
              <Link to="/emergency" className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="font-medium text-slate-700">Configure Emergency Card</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <LogEventModal
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        onSuccess={loadDashboardData}
        defaultTreatmentId={selectedMedForLog.treatmentId}
        defaultMedicationName={selectedMedForLog.name}
        defaultForm={selectedMedForLog.form}
      />
    </div>
  );
};
