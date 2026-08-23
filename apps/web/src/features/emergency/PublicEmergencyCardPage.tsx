import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api-client';
import {
  AlertTriangle,
  HeartPulse,
  Phone,
  ShieldAlert,
  Pill,
} from 'lucide-react';

export const PublicEmergencyCardPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<{
    displayName: string;
    bloodGroup: string;
    dateOfBirth?: string | null;
    gender: string;
    emergencyContacts: Array<{ name: string; relationship: string; phone: string }>;
    allergies: string[];
    medications: Array<{ name: string; dose?: string }>;
    medicalNotes?: string | null;
    disclaimer: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    api
      .get<typeof data>(`/api/v1/emergency/public/${token}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Emergency card not available'))
      .finally(() => setIsLoading(false));
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <p className="text-sm">Loading Emergency Card...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="card p-8 max-w-md w-full text-center space-y-3 bg-white">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Card Unavailable</h3>
          <p className="text-xs text-slate-600">{error || 'This emergency card has been disabled.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-6 px-4 sm:px-6">
      <div className="max-w-md mx-auto space-y-4">
        {/* Urgent Emergency Header */}
        <div className="bg-red-600 text-white p-5 rounded-2xl shadow-lg text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-1">
            <HeartPulse className="w-4 h-4" /> Emergency Medical ID
          </div>
          <h1 className="text-2xl font-black tracking-tight">{data.displayName}</h1>
          <div className="flex justify-center gap-3 text-xs font-semibold text-red-100 pt-1">
            <span>Blood: {data.bloodGroup}</span>
            <span>•</span>
            <span>Gender: {data.gender}</span>
            <span>•</span>
            <span>DOB: {data.dateOfBirth ? data.dateOfBirth.split('T')[0] : 'N/A'}</span>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="card p-5 bg-white border border-slate-200 shadow-md space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-red-600" />
            Emergency Contacts
          </h2>

          <div className="space-y-2">
            {data.emergencyContacts.length === 0 ? (
              <p className="text-xs text-slate-400">No contacts listed.</p>
            ) : (
              data.emergencyContacts.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{c.name}</p>
                    <p className="text-[11px] text-slate-500">{c.relationship}</p>
                  </div>
                  <a
                    href={`tel:${c.phone}`}
                    className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs py-1 px-3 flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    Call {c.phone}
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Critical Allergies */}
        <div className="card p-5 bg-white border border-slate-200 shadow-md space-y-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            Critical Allergies
          </h2>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {data.allergies.length === 0 ? (
              <span className="text-xs text-slate-400">No known allergies.</span>
            ) : (
              data.allergies.map((a, idx) => (
                <span key={idx} className="badge bg-red-100 text-red-800 font-bold text-xs py-1 px-2.5">
                  {a}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Selected Critical Medications */}
        <div className="card p-5 bg-white border border-slate-200 shadow-md space-y-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Pill className="w-4 h-4 text-sky-600" />
            Selected Current Medications
          </h2>
          <ul className="divide-y divide-slate-100 text-xs">
            {data.medications.length === 0 ? (
              <li className="py-2 text-slate-400">None selected.</li>
            ) : (
              data.medications.map((m, idx) => (
                <li key={idx} className="py-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{m.name}</span>
                  {m.dose && <span className="text-slate-500 font-medium">{m.dose}</span>}
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Medical Notes */}
        {data.medicalNotes && (
          <div className="card p-5 bg-white border border-slate-200 shadow-md space-y-1">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Medical Notes</h2>
            <p className="text-xs text-slate-700 leading-relaxed">{data.medicalNotes}</p>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-slate-400 text-center pt-2">{data.disclaimer}</p>
      </div>
    </div>
  );
};
