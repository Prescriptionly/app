import React, { useState } from 'react';
import { api } from '../../services/api-client';
import { useAuth } from '../../services/auth-context';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

interface LogEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultTreatmentId?: string;
  defaultMedicationName?: string;
  defaultForm?: string;
}

export const LogEventModal: React.FC<LogEventModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultTreatmentId,
  defaultMedicationName,
  defaultForm,
}) => {
  const { activeProfile } = useAuth();
  const [medicationName, setMedicationName] = useState(defaultMedicationName || '');
  const [treatmentId, setTreatmentId] = useState(defaultTreatmentId || '');
  const [form, setForm] = useState(defaultForm || 'TABLET');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('dose');
  const [action, setAction] = useState('TAKEN');
  const [eventTimestamp, setEventTimestamp] = useState(new Date().toISOString().slice(0, 16));
  const [isApproximateTime, setIsApproximateTime] = useState(false);
  const [isStandalone, setIsStandalone] = useState(!defaultTreatmentId);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (defaultMedicationName) setMedicationName(defaultMedicationName);
    if (defaultTreatmentId) {
      setTreatmentId(defaultTreatmentId);
      setIsStandalone(false);
    }
    if (defaultForm) setForm(defaultForm);
  }, [defaultMedicationName, defaultTreatmentId, defaultForm]);

  if (!isOpen || !activeProfile) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/api/v1/medication-events', {
        patientProfileId: activeProfile.id,
        treatmentId: isStandalone ? null : (treatmentId || null),
        medicationName,
        form,
        quantity: parseFloat(quantity) || 1,
        unit,
        action,
        eventTimestamp: new Date(eventTimestamp).toISOString(),
        isApproximateTime,
        notes: notes || null,
        isStandalone,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to log medication event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="card w-full max-w-lg p-6 shadow-xl relative animate-in fade-in zoom-in duration-150">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Record Medication Event</h3>
            <p className="text-xs text-slate-500">Record what was actually taken or skipped</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Medication Name</label>
            <input
              type="text"
              required
              value={medicationName}
              onChange={(e) => setMedicationName(e.target.value)}
              className="input-field text-xs"
              placeholder="e.g. Metformin 500mg or OTC Aspirin"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="input-field text-xs"
              >
                <option value="TAKEN">Taken / Ingested</option>
                <option value="ADMINISTERED">Administered (Injection/IV)</option>
                <option value="APPLIED">Applied (Cream/Patch)</option>
                <option value="USED">Used (Inhaler/Drops)</option>
                <option value="SKIPPED">Skipped / Missed</option>
                <option value="PARTIAL">Partial Dose</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Dosage Form</label>
              <select
                value={form}
                onChange={(e) => setForm(e.target.value)}
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit</label>
              <input
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="input-field text-xs"
                placeholder="tablet, mL, puffs, units"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Event Timestamp</label>
            <input
              type="datetime-local"
              required
              value={eventTimestamp}
              onChange={(e) => setEventTimestamp(e.target.value)}
              className="input-field text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="approximate"
              checked={isApproximateTime}
              onChange={(e) => setIsApproximateTime(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <label htmlFor="approximate" className="text-slate-600 font-medium">
              Time is approximate (e.g. logged from memory later)
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="standalone"
              checked={isStandalone}
              onChange={(e) => setIsStandalone(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <label htmlFor="standalone" className="text-slate-600 font-medium">
              Standalone dose (OTC / non-prescription supplement)
            </label>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes / Circumstances</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field text-xs"
              placeholder="e.g. Taken with food, mild headache after exercise..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
              {isSubmitting ? 'Saving...' : 'Save Medication Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
