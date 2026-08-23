import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api-client';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  ShieldCheck,
} from 'lucide-react';

interface CandidateMedication {
  enteredName: string;
  form: string;
  strength?: string | null;
  originalInstructionText: string;
  doseQuantity: number;
  doseUnit: string;
  route?: string | null;
  frequencyCount: number;
  frequencyPeriod: string;
  timingDetails?: string | null;
  isPrn: boolean;
  prnReason?: string | null;
  durationDays?: number | null;
  confidence: number;
  warningFlags: string[];
}

export const OcrReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [extraction, setExtraction] = useState<{
    id: string;
    status: string;
    isConfirmed: boolean;
    ocrText?: string | null;
    confidenceScoresJson?: string | null;
    rawExtractedJson?: string | null;
    documentVersion: {
      id: string;
      fileName: string;
      document: {
        id: string;
        title: string;
      };
    };
  } | null>(null);

  const [prescriberName, setPrescriberName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [prescribedDate, setPrescribedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [medications, setMedications] = useState<CandidateMedication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    api
      .get<{
        id: string;
        status: string;
        isConfirmed: boolean;
        ocrText?: string | null;
        confidenceScoresJson?: string | null;
        rawExtractedJson?: string | null;
        documentVersion: {
          id: string;
          fileName: string;
          document: {
            id: string;
            title: string;
          };
        };
      }>(`/api/v1/ocr/${id}`)
      .then((data) => {
        setExtraction(data);
        if (data && data.rawExtractedJson) {
          try {
            const raw = JSON.parse(data.rawExtractedJson);
            setPrescriberName(raw.prescriberName || '');
            setClinicName(raw.clinicName || '');
            if (raw.prescribedDate) setPrescribedDate(raw.prescribedDate);
            if (raw.medications && Array.isArray(raw.medications)) {
              setMedications(raw.medications);
            }
          } catch {
            // fallback
          }
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load extraction draft'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const updateMedication = (index: number, updates: Partial<CandidateMedication>) => {
    setMedications((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], ...updates };
      }
      return copy;
    });
  };

  const addMedication = () => {
    setMedications((prev) => [
      ...prev,
      {
        enteredName: '',
        form: 'TABLET',
        strength: '',
        originalInstructionText: '',
        doseQuantity: 1,
        doseUnit: 'tablet',
        frequencyCount: 1,
        frequencyPeriod: 'DAY',
        isPrn: false,
        confidence: 1.0,
        warningFlags: [],
      },
    ]);
  };

  const removeMedication = (index: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await api.post('/api/v1/ocr/confirm', {
        extractionId: id,
        prescriberName,
        clinicName,
        prescribedDate,
        notes,
        medications,
      });

      navigate('/prescriptions');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Confirmation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="py-12 text-center text-xs text-slate-400">Loading draft extraction review...</div>;
  }

  if (!extraction) {
    return (
      <div className="card p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-700">Extraction record not found</p>
        <Link to="/documents" className="btn-secondary text-xs">
          Back to Vault
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to={`/documents/${extraction.documentVersion.document.id}`} className="text-xs text-sky-600 hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              {extraction.documentVersion.document.title}
            </Link>
            <span className="badge badge-extracted text-[10px]">Untrusted Draft</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Review & Confirm Extracted Prescription</h2>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Source file: {extraction.documentVersion.fileName}
        </span>
      </div>

      {/* Grounding & Safety Banner */}
      <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs space-y-1.5 shadow-xs">
        <div className="flex items-center gap-2 font-bold text-amber-950">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Patient Verification Required</span>
        </div>
        <p>
          OCR candidates below are draft predictions. Inspect critical values carefully—especially decimal points (e.g.{' '}
          <strong className="underline decoration-amber-500 font-bold">0.5 mg</strong> vs{' '}
          <strong className="underline decoration-amber-500 font-bold">5 mg</strong>) and frequencies. Confirmed values will create structured active regimens.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleConfirm} className="space-y-6 text-xs">
        {/* Prescription Metadata */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-600" />
            Prescription Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Prescriber Name</label>
              <input
                type="text"
                value={prescriberName}
                onChange={(e) => setPrescriberName(e.target.value)}
                className="input-field text-xs"
                placeholder="Dr. Sarah Jenkins"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Clinic / Hospital</label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="input-field text-xs"
                placeholder="Metro Health Clinic"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Prescribed Date</label>
              <input
                type="date"
                required
                value={prescribedDate}
                onChange={(e) => setPrescribedDate(e.target.value)}
                className="input-field text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Prescription Notes / Context</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Verified handwritten instructions from doctor"
              className="input-field text-xs"
            />
          </div>
        </div>

        {/* Candidate Medications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Extracted Medications ({medications.length})</h3>
              <p className="text-slate-500 text-[11px]">Verify each item, structured dose, and original instruction text.</p>
            </div>
            <button
              type="button"
              onClick={addMedication}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Medication
            </button>
          </div>

          {medications.map((med, index) => {
            const hasWarnings = med.warningFlags && med.warningFlags.length > 0;
            return (
              <div
                key={index}
                className={`card p-5 space-y-4 border-2 transition-colors ${
                  hasWarnings ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">Medication #{index + 1}</span>
                    <span
                      className={`badge text-[10px] ${
                        med.confidence >= 0.85 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Confidence: {Math.round(med.confidence * 100)}%
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeMedication(index)}
                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Remove candidate"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {hasWarnings && (
                  <div className="p-3 rounded-lg bg-amber-100/70 border border-amber-300 text-amber-900 space-y-1">
                    {med.warningFlags.map((w, wi) => (
                      <p key={wi} className="font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        {w}
                      </p>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Medication Name</label>
                    <input
                      type="text"
                      required
                      value={med.enteredName}
                      onChange={(e) => updateMedication(index, { enteredName: e.target.value })}
                      className="input-field text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Dosage Form</label>
                    <select
                      value={med.form}
                      onChange={(e) => updateMedication(index, { form: e.target.value })}
                      className="input-field text-xs"
                    >
                      <option value="TABLET">Tablet</option>
                      <option value="CAPSULE">Capsule</option>
                      <option value="SYRUP">Syrup</option>
                      <option value="INJECTION">Injection</option>
                      <option value="INHALER">Inhaler</option>
                      <option value="CREAM">Cream / Ointment</option>
                      <option value="DROPS">Drops</option>
                      <option value="PATCH">Patch</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Strength (e.g. 500 mg)</label>
                    <input
                      type="text"
                      value={med.strength || ''}
                      onChange={(e) => updateMedication(index, { strength: e.target.value })}
                      className="input-field text-xs"
                      placeholder="e.g. 500 mg, 0.5 g, 20 mcg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Original Instruction Text</label>
                  <input
                    type="text"
                    required
                    value={med.originalInstructionText}
                    onChange={(e) => updateMedication(index, { originalInstructionText: e.target.value })}
                    className="input-field text-xs"
                    placeholder="Take 1 tablet twice daily with food"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Dose Quantity</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={med.doseQuantity}
                      onChange={(e) => updateMedication(index, { doseQuantity: parseFloat(e.target.value) || 1 })}
                      className="input-field text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Dose Unit</label>
                    <input
                      type="text"
                      required
                      value={med.doseUnit}
                      onChange={(e) => updateMedication(index, { doseUnit: e.target.value })}
                      className="input-field text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Frequency Count</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={med.frequencyCount}
                      onChange={(e) => updateMedication(index, { frequencyCount: parseInt(e.target.value) || 1 })}
                      className="input-field text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Period</label>
                    <select
                      value={med.frequencyPeriod}
                      onChange={(e) => updateMedication(index, { frequencyPeriod: e.target.value })}
                      className="input-field text-xs bg-white"
                    >
                      <option value="DAY">Daily / Per Day</option>
                      <option value="WEEK">Weekly</option>
                      <option value="MONTH">Monthly</option>
                      <option value="AS_NEEDED">As Needed (PRN)</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Confirmation Actions */}
        <div className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Confirming saves structured clinical records while retaining original draft extraction history.</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link to="/documents" className="btn-secondary text-xs">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || medications.length === 0}
              className="btn-primary text-xs py-2 px-4 shadow-sm bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Confirming...' : 'Confirm & Save Prescription'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
