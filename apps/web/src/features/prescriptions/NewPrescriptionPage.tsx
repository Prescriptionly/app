import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../services/auth-context';
import { api } from '../../services/api-client';
import {
  Plus,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const NewPrescriptionPage: React.FC = () => {
  const { activeProfile } = useAuth();
  const navigate = useNavigate();

  const [prescriberName, setPrescriberName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [prescribedDate, setPrescribedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [items, setItems] = useState([
    {
      enteredMedicationName: '',
      form: 'TABLET',
      strength: '',
      originalInstructionText: '',
      doseQuantity: 1,
      doseUnit: 'tablet',
      frequencyCount: 1,
      frequencyPeriod: 'DAY',
      isPrn: false,
      durationDays: 30,
    },
  ]);

  if (!activeProfile) return null;

  const updateItem = (index: number, updates: Partial<(typeof items)[0]>) => {
    setItems((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], ...updates };
      }
      return copy;
    });
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        enteredMedicationName: '',
        form: 'TABLET',
        strength: '',
        originalInstructionText: '',
        doseQuantity: 1,
        doseUnit: 'tablet',
        frequencyCount: 1,
        frequencyPeriod: 'DAY',
        isPrn: false,
        durationDays: 30,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await api.post('/api/v1/prescriptions', {
        patientProfileId: activeProfile.id,
        prescriberName: prescriberName || null,
        clinicName: clinicName || null,
        prescribedDate,
        notes: notes || null,
        items,
      });

      navigate('/prescriptions');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create prescription');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Link to="/prescriptions" className="btn-secondary text-xs py-1.5 px-3">
          <ArrowLeft className="w-4 h-4" />
          Back to Prescriptions
        </Link>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Manual Prescription Entry</h2>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Prescription Metadata */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-600" />
            Doctor & Clinic Info
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Prescriber Name</label>
              <input
                type="text"
                value={prescriberName}
                onChange={(e) => setPrescriberName(e.target.value)}
                placeholder="e.g. Dr. Sarah Jenkins"
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Clinic / Hospital</label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="e.g. City General Clinic"
                className="input-field text-xs"
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
            <label className="block font-semibold text-slate-700 mb-1">Notes / Instructions</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Prescribed for post-op recovery"
              className="input-field text-xs"
            />
          </div>
        </div>

        {/* Prescription Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Medications ({items.length})</h3>
              <p className="text-slate-500 text-[11px]">Enter both original instruction text and structured dosage.</p>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Medication
            </button>
          </div>

          {items.map((item, index) => (
            <div key={index} className="card p-5 space-y-4 bg-white border border-slate-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-900 text-sm">Medication #{index + 1}</span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Medication Name</label>
                  <input
                    type="text"
                    required
                    value={item.enteredMedicationName}
                    onChange={(e) => updateItem(index, { enteredMedicationName: e.target.value })}
                    placeholder="e.g. Metformin, Lisinopril, OTC Vitamin D"
                    className="input-field text-xs font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dosage Form</label>
                  <select
                    value={item.form}
                    onChange={(e) => updateItem(index, { form: e.target.value })}
                    className="input-field text-xs"
                  >
                    <option value="TABLET">Tablet</option>
                    <option value="CAPSULE">Capsule</option>
                    <option value="SYRUP">Syrup / Liquid</option>
                    <option value="INJECTION">Injection</option>
                    <option value="INHALER">Inhaler</option>
                    <option value="CREAM">Cream / Ointment</option>
                    <option value="DROPS">Drops</option>
                    <option value="PATCH">Patch</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Strength (optional)</label>
                  <input
                    type="text"
                    value={item.strength}
                    onChange={(e) => updateItem(index, { strength: e.target.value })}
                    placeholder="e.g. 500 mg, 10 mL"
                    className="input-field text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Original Prescription Instruction Text</label>
                <input
                  type="text"
                  required
                  value={item.originalInstructionText}
                  onChange={(e) => updateItem(index, { originalInstructionText: e.target.value })}
                  placeholder="e.g. 1 tablet twice daily with food"
                  className="input-field text-xs"
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
                    value={item.doseQuantity}
                    onChange={(e) => updateItem(index, { doseQuantity: parseFloat(e.target.value) || 1 })}
                    className="input-field text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-600 mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    value={item.doseUnit}
                    onChange={(e) => updateItem(index, { doseUnit: e.target.value })}
                    className="input-field text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-600 mb-1">Frequency Count</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={item.frequencyCount}
                    onChange={(e) => updateItem(index, { frequencyCount: parseInt(e.target.value) || 1 })}
                    className="input-field text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-600 mb-1">Frequency Period</label>
                  <select
                    value={item.frequencyPeriod}
                    onChange={(e) => updateItem(index, { frequencyPeriod: e.target.value })}
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
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link to="/prescriptions" className="btn-secondary text-xs">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary text-xs py-2 px-4 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Saving Prescription...' : 'Save Prescription & Initialize Treatments'}
          </button>
        </div>
      </form>
    </div>
  );
};
