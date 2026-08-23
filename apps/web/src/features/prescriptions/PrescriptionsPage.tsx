import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../services/auth-context';
import { api } from '../../services/api-client';
import {
  Pill,
  Plus,
  FileText,
  CheckCircle2,
} from 'lucide-react';

export const PrescriptionsPage: React.FC = () => {
  const { activeProfile } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Array<{
    id: string;
    prescriberName?: string | null;
    clinicName?: string | null;
    prescribedDate: string;
    notes?: string | null;
    status: string;
    sourceDocument?: {
      id: string;
      title: string;
      category: string;
    } | null;
    items: Array<{
      id: string;
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
      treatments: Array<{ id: string; status: string }>;
    }>;
  }>>([]);

  const [isLoading, setIsLoading] = useState(true);

  const loadPrescriptions = useCallback(async () => {
    if (!activeProfile) return;
    setIsLoading(true);
    try {
      const data = await api.get<typeof prescriptions>('/api/v1/prescriptions', {
        patientProfileId: activeProfile.id,
      });
      setPrescriptions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  if (!activeProfile) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Prescriptions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Prescriptions are historical medical evidence authored by clinicians.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/documents" className="btn-secondary text-xs py-2 px-3">
            <FileText className="w-4 h-4" />
            Upload Rx Image
          </Link>
          <Link to="/prescriptions/new" className="btn-primary text-xs py-2 px-4 shadow-sm">
            <Plus className="w-4 h-4" />
            Manual Prescription
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading prescriptions...</div>
      ) : prescriptions.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <Pill className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-700">No prescriptions recorded</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload a doctor's prescription photograph/PDF or enter medication items manually.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <Link to="/documents" className="btn-secondary text-xs py-1.5 px-3">
              Upload Prescription Document
            </Link>
            <Link to="/prescriptions/new" className="btn-primary text-xs py-1.5 px-3">
              Add Manual Entry
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((rx) => (
            <div key={rx.id} className="card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Prescribed on {new Date(rx.prescribedDate).toLocaleDateString()}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {rx.prescriberName ? `Prescriber: ${rx.prescriberName}` : 'Doctor Prescription'}
                      {rx.clinicName ? ` • ${rx.clinicName}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {rx.sourceDocument && (
                    <Link
                      to={`/documents/${rx.sourceDocument.id}`}
                      className="badge bg-slate-100 text-slate-700 hover:bg-slate-200 text-[10px] flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3 text-slate-500" />
                      Source Evidence
                    </Link>
                  )}
                  <span className="badge badge-prescribed text-[10px]">{rx.status}</span>
                </div>
              </div>

              {rx.notes && <p className="text-xs text-slate-600 italic">{rx.notes}</p>}

              <div className="divide-y divide-slate-100">
                {rx.items.map((item) => {
                  const inst = item.dosageInstructions[0];
                  return (
                    <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{item.enteredMedicationName}</span>
                          <span className="badge bg-slate-100 text-slate-700 text-[10px]">{item.form}</span>
                          {item.strength && (
                            <span className="text-slate-500 font-medium">({item.strength})</span>
                          )}
                          {inst?.isPrn && (
                            <span className="badge bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                              PRN (As Needed)
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 mt-1 font-medium">
                          Structured: {inst ? `${inst.doseQuantity} ${inst.doseUnit} (${inst.frequencyCount}x/${inst.frequencyPeriod})` : 'Standard'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Original text: "{item.originalInstructionText}"</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.treatments.length > 0 ? (
                          <span className="badge badge-reported text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> Active Treatment Course
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Prescription on file</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
