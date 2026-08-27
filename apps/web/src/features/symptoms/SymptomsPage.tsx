import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../services/auth-context';
import { api } from '../../services/api-client';
import {
  Activity,
  Plus,
  Trash2,
} from 'lucide-react';

export const SymptomsPage: React.FC = () => {
  const { activeProfile } = useAuth();
  const [symptoms, setSymptoms] = useState<Array<{
    id: string;
    name: string;
    severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
    startedAt: string;
    endedAt?: string | null;
    isApproximate: boolean;
    notes?: string | null;
    treatment?: { id: string; customMedicationName?: string | null } | null;
  }>>([]);

  const [treatments, setTreatments] = useState<Array<{ id: string; customMedicationName?: string | null; prescriptionItem?: { enteredMedicationName: string } }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [severity, setSeverity] = useState('MILD');
  const [startedAt, setStartedAt] = useState(new Date().toISOString().slice(0, 16));
  const [isApproximate, setIsApproximate] = useState(false);
  const [treatmentId, setTreatmentId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeProfile) return;
    setIsLoading(true);
    try {
      const [syms, txs] = await Promise.all([
        api.get<typeof symptoms>('/api/v1/symptoms', { patientProfileId: activeProfile.id }),
        api.get<typeof treatments>('/api/v1/treatments', { patientProfileId: activeProfile.id, status: 'ACTIVE' }),
      ]);
      setSymptoms(syms);
      setTreatments(txs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    setIsSubmitting(true);
    try {
      await api.post('/api/v1/symptoms', {
        patientProfileId: activeProfile.id,
        name,
        severity,
        startedAt: new Date(startedAt).toISOString(),
        isApproximate,
        treatmentId: treatmentId || null,
        notes: notes || null,
      });

      setModalOpen(false);
      setName('');
      setNotes('');
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/v1/symptoms/${id}`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (!activeProfile) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Symptoms & Observations</h2>            
          </div>
          <p className="text-xs text-slate-500">
            Record patient-reported observations. Associations with treatments are non-causal timeline correlations.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary text-xs py-2 px-4 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Report Symptom
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading symptoms...</div>
      ) : symptoms.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <Activity className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-700">No symptoms reported</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Log observed symptoms or physical sensations to review alongside your medication timeline.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {symptoms.map((s) => (
            <div key={s.id} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-900 text-sm">{s.name}</span>
                  <span
                    className={`badge text-[10px] ${
                      s.severity === 'CRITICAL'
                        ? 'bg-red-100 text-red-800'
                        : s.severity === 'SEVERE'
                        ? 'bg-orange-100 text-orange-800'
                        : s.severity === 'MODERATE'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {s.severity}
                  </span>
                  {s.treatment && (
                    <span className="badge bg-sky-50 text-sky-700 text-[10px]">
                      Concurrent with {s.treatment.customMedicationName || 'Treatment'}
                    </span>
                  )}
                </div>

                {s.notes && <p className="text-xs text-slate-600 mt-0.5">{s.notes}</p>}

                <p className="text-[11px] text-slate-400 mt-1">
                  Started: {new Date(s.startedAt).toLocaleString()}{' '}
                  {s.isApproximate && '(approximate)'}
                </p>
              </div>

              <button
                onClick={() => handleDelete(s.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 self-start sm:self-auto"
                title="Delete symptom"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="card w-full max-w-lg p-6 shadow-xl relative animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Report Symptom or Observation</h3>
            <p className="text-xs text-slate-500 mb-4">Recorded as patient-reported fact.</p>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Symptom Description</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mild headache, Dizziness, Nausea"
                  className="input-field text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Severity Scale</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="input-field text-xs"
                  >
                    <option value="MILD">Mild</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="SEVERE">Severe</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Associated Active Treatment (Optional)</label>
                  <select
                    value={treatmentId}
                    onChange={(e) => setTreatmentId(e.target.value)}
                    className="input-field text-xs"
                  >
                    <option value="">None / Standalone</option>
                    {treatments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.prescriptionItem?.enteredMedicationName || t.customMedicationName || 'Treatment'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Started At</label>
                <input
                  type="datetime-local"
                  required
                  value={startedAt}
                  onChange={(e) => setStartedAt(e.target.value)}
                  className="input-field text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="approx"
                  checked={isApproximate}
                  onChange={(e) => setIsApproximate(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="approx" className="text-slate-600 font-medium">
                  Timestamp is approximate
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Circumstances, triggers, or description..."
                  className="input-field text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Save Observation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
