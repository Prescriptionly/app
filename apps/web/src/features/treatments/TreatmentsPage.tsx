import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../services/auth-context';
import { api } from '../../services/api-client';
import { LogEventModal } from '../events/LogEventModal';
import {
  HeartPulse,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  PlusCircle,
} from 'lucide-react';

export const TreatmentsPage: React.FC = () => {
  const { activeProfile } = useAuth();
  const [treatments, setTreatments] = useState<Array<{
    id: string;
    customMedicationName?: string | null;
    status: 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'DISCONTINUED';
    startDate: string;
    endDate?: string | null;
    stopReason?: string | null;
    notes?: string | null;
    prescriptionItem?: {
      enteredMedicationName: string;
      form: string;
      strength?: string | null;
      originalInstructionText: string;
      dosageInstructions: Array<{
        doseQuantity: number;
        doseUnit: string;
        frequencyCount: number;
        frequencyPeriod: string;
        isPrn: boolean;
      }>;
    } | null;
  }>>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<{ id?: string; name?: string; form?: string }>({});

  const loadTreatments = useCallback(async () => {
    if (!activeProfile) return;
    setIsLoading(true);
    try {
      const data = await api.get<typeof treatments>('/api/v1/treatments', {
        patientProfileId: activeProfile.id,
      });
      setTreatments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    loadTreatments();
  }, [loadTreatments]);

  const handleUpdateStatus = async (treatmentId: string, newStatus: string, stopReason?: string) => {
    try {
      await api.patch(`/api/v1/treatments/${treatmentId}/status`, {
        status: newStatus,
        stopReason: stopReason || null,
      });
      loadTreatments();
    } catch (err) {
      console.error(err);
    }
  };

  if (!activeProfile) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Active Regimens & Medication Courses</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Treatments track what is currently being taken, paused, completed, or discontinued over time.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedTreatment({});
            setLogModalOpen(true);
          }}
          className="btn-primary text-xs py-2 px-4 shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Log Dose
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading treatment regimens...</div>
      ) : treatments.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <HeartPulse className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-700">No active treatments</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When you upload or enter prescriptions, active treatment courses are created automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {treatments.map((t) => {
            const medName = t.prescriptionItem?.enteredMedicationName || t.customMedicationName || 'Medication';
            const form = t.prescriptionItem?.form || 'TABLET';
            const inst = t.prescriptionItem?.dosageInstructions[0];

            return (
              <div key={t.id} className="card p-5 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-prescribed text-[10px]">{form}</span>
                      <span
                        className={`badge text-[10px] ${
                          t.status === 'ACTIVE'
                            ? 'badge-reported'
                            : t.status === 'PAUSED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400">
                      Started: {new Date(t.startDate).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{medName}</h3>
                  {t.prescriptionItem?.strength && (
                    <p className="text-xs font-semibold text-slate-600">{t.prescriptionItem.strength}</p>
                  )}

                  {inst && (
                    <p className="text-xs text-sky-700 bg-sky-50 p-2 rounded-md font-medium mt-2">
                      {inst.doseQuantity} {inst.doseUnit} • {inst.frequencyCount} time(s) per {inst.frequencyPeriod.toLowerCase()}
                      {inst.isPrn && ' (As Needed)'}
                    </p>
                  )}

                  {t.prescriptionItem?.originalInstructionText && (
                    <p className="text-[11px] text-slate-500 italic mt-2">
                      "{t.prescriptionItem.originalInstructionText}"
                    </p>
                  )}

                  {t.stopReason && (
                    <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-md mt-2">
                      Reason for stopping/pause: {t.stopReason}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedTreatment({ id: t.id, name: medName, form });
                      setLogModalOpen(true);
                    }}
                    className="btn-primary text-xs py-1 px-3 shadow-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Log Dose
                  </button>

                  <div className="flex items-center gap-1.5">
                    {t.status === 'ACTIVE' ? (
                      <button
                        onClick={() => handleUpdateStatus(t.id, 'PAUSED', 'Paused by patient')}
                        className="btn-secondary text-[11px] py-1 px-2 text-amber-700"
                        title="Pause treatment"
                      >
                        <Pause className="w-3 h-3" /> Pause
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(t.id, 'ACTIVE')}
                        className="btn-secondary text-[11px] py-1 px-2 text-emerald-700"
                        title="Resume treatment"
                      >
                        <Play className="w-3 h-3" /> Resume
                      </button>
                    )}

                    {t.status !== 'COMPLETED' && t.status !== 'DISCONTINUED' && (
                      <button
                        onClick={() => handleUpdateStatus(t.id, 'DISCONTINUED', 'Course finished')}
                        className="btn-secondary text-[11px] py-1 px-2 text-slate-500 hover:text-red-600"
                        title="Complete / Discontinue"
                      >
                        <XCircle className="w-3 h-3" /> End
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LogEventModal
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        onSuccess={loadTreatments}
        defaultTreatmentId={selectedTreatment.id}
        defaultMedicationName={selectedTreatment.name}
        defaultForm={selectedTreatment.form}
      />
    </div>
  );
};
