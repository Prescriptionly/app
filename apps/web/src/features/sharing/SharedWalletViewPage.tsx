import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api-client';
import {
  HeartPulse,
  Pill,
  Clock,
  FileText,
  AlertTriangle,
} from 'lucide-react';

export const SharedWalletViewPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<{
    patient: { displayName: string; gender: string; timezone: string };
    recipientLabel: string;
    expiresAt: string;
    activeTreatments?: Array<{
      id: string;
      customMedicationName?: string | null;
      startDate: string;
      prescriptionItem?: {
        enteredMedicationName: string;
        form: string;
        dosageInstructions: Array<{ doseQuantity: number; doseUnit: string; frequencyCount: number; frequencyPeriod: string; isPrn: boolean }>;
      };
    }>;
    recentEvents?: Array<{
      id: string;
      medicationName: string;
      action: string;
      quantity: number;
      unit: string;
      eventTimestamp: string;
    }>;
    documents?: Array<{
      id: string;
      title: string;
      category: string;
      createdAt: string;
    }>;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    api
      .get<typeof data>(`/api/v1/sharing/view/${token}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Invalid or expired share link'))
      .finally(() => setIsLoading(false));
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-xs text-slate-500">Loading shared medical wallet...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="card p-8 max-w-md w-full text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Access Denied</h3>
          <p className="text-xs text-slate-600">{error || 'This share link is expired, invalid, or revoked.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="card p-6 bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="badge badge-prescribed text-[10px]">Shared Medical Record</span>
                <span className="badge bg-slate-100 text-slate-600 text-[10px]">Read-Only</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">{data.patient.displayName}</h2>
            </div>
          </div>

          <div className="text-xs text-slate-500 text-left sm:text-right">
            <p>Shared for: <span className="font-semibold text-slate-800">{data.recipientLabel}</span></p>
            <p className="text-[11px] text-slate-400">Expires: {new Date(data.expiresAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Active Medications */}
        {data.activeTreatments && (
          <div className="card p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Pill className="w-4 h-4 text-sky-600" />
              Active Medication Regimens ({data.activeTreatments.length})
            </h3>
            {data.activeTreatments.length === 0 ? (
              <p className="text-xs text-slate-400">No active medications shared.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.activeTreatments.map((t) => {
                  const item = t.prescriptionItem;
                  const inst = item?.dosageInstructions[0];
                  return (
                    <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">
                          {item?.enteredMedicationName || t.customMedicationName}
                        </span>
                        <span className="badge bg-slate-100 text-slate-700 text-[10px] ml-2">
                          {item?.form || 'TABLET'}
                        </span>
                        {inst && (
                          <p className="text-slate-500 mt-0.5">
                            Dose: {inst.doseQuantity} {inst.doseUnit} ({inst.frequencyCount}x/{inst.frequencyPeriod})
                            {inst.isPrn && ' [PRN]'}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">Started {new Date(t.startDate).toLocaleDateString()}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Medication Events History */}
        {data.recentEvents && (
          <div className="card p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Reported Medication Event History ({data.recentEvents.length})
            </h3>
            {data.recentEvents.length === 0 ? (
              <p className="text-xs text-slate-400">No events shared.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recentEvents.map((e) => (
                  <div key={e.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="badge badge-reported text-[10px] mr-2">{e.action}</span>
                      <span className="font-semibold text-slate-800">{e.medicationName}</span>
                      <span className="text-slate-500 ml-1">({e.quantity} {e.unit})</span>
                    </div>
                    <span className="text-slate-400 text-[11px] font-mono">
                      {new Date(e.eventTimestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Shared Documents */}
        {data.documents && (
          <div className="card p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              Medical Documents Metadata ({data.documents.length})
            </h3>
            <div className="divide-y divide-slate-100">
              {data.documents.map((d) => (
                <div key={d.id} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">{d.title}</span>
                    <span className="text-slate-500 text-[10px] ml-2 uppercase">({d.category})</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">{new Date(d.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Disclaimer */}
        <div className="text-center text-[11px] text-slate-400 p-4">
          Prescriptionly Trustworthy Health Wallet • Verified Scoped Access
        </div>
      </div>
    </div>
  );
};
