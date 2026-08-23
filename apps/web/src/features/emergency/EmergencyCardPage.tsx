import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../services/auth-context';
import { api } from '../../services/api-client';
import {
  HeartPulse,
  Phone,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export const EmergencyCardPage: React.FC = () => {
  const { activeProfile } = useAuth();
  const [profile, setProfile] = useState<{
    id: string;
    tokenHash: string;
    emergencyContactsJson: string;
    selectedAllergiesJson: string;
    selectedMedicationIdsJson: string;
    medicalNotes?: string | null;
    isEnabled: boolean;
  } | null>(null);

  const [treatments, setTreatments] = useState<Array<{ id: string; customMedicationName?: string | null; prescriptionItem?: { enteredMedicationName: string } }>>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [selectedMedIds, setSelectedMedIds] = useState<string[]>([]);
  const [medicalNotes, setMedicalNotes] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  const [allergyInput, setAllergyInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeProfile) return;
    setIsLoading(true);
    try {
      const [emProfile, txs] = await Promise.all([
        api.get<typeof profile>('/api/v1/emergency', { patientProfileId: activeProfile.id }),
        api.get<typeof treatments>('/api/v1/treatments', { patientProfileId: activeProfile.id, status: 'ACTIVE' }),
      ]);

      setProfile(emProfile);
      setTreatments(txs);
      if (emProfile) {
        setContacts(JSON.parse(emProfile.emergencyContactsJson || '[]'));
        setAllergies(JSON.parse(emProfile.selectedAllergiesJson || '[]'));
        setSelectedMedIds(JSON.parse(emProfile.selectedMedicationIdsJson || '[]'));
        setMedicalNotes(emProfile.medicalNotes || '');
        setIsEnabled(emProfile.isEnabled);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addContact = () => {
    setContacts((prev) => [...prev, { name: '', relationship: '', phone: '' }]);
  };

  const updateContact = (index: number, field: keyof EmergencyContact, val: string) => {
    setContacts((prev) => {
      const copy = [...prev];
      if (copy[index]) copy[index][field] = val;
      return copy;
    });
  };

  const removeContact = (index: number) => {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const addAllergy = () => {
    if (!allergyInput.trim()) return;
    setAllergies((prev) => [...prev, allergyInput.trim()]);
    setAllergyInput('');
  };

  const removeAllergy = (index: number) => {
    setAllergies((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleMedication = (id: string) => {
    setSelectedMedIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await api.post('/api/v1/emergency/update', {
        patientProfileId: activeProfile.id,
        emergencyContacts: contacts,
        selectedAllergies: allergies,
        selectedMedicationIds: selectedMedIds,
        medicalNotes,
        isEnabled,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeProfile) return null;

  if (isLoading) {
    return <div className="py-12 text-center text-xs text-slate-400">Loading emergency settings...</div>;
  }

  const publicUrl = profile ? `${window.location.origin}/emergency-card/${profile.tokenHash}` : '';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Deliberately Limited Emergency Card</h2>
          <span className="badge bg-red-100 text-red-800 text-[10px]">Critical Access</span>
        </div>
        <p className="text-xs text-slate-500">
          First responders or doctors can scan or access only this deliberately limited dataset in emergency situations.
        </p>
      </div>

      {profile && (
        <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase">Public Emergency Card Link</span>
            <p className="font-mono text-xs text-sky-400 truncate max-w-md mt-0.5">{publicUrl}</p>
          </div>

          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary bg-sky-500 hover:bg-sky-600 text-white text-xs py-1.5 px-3 self-start sm:self-auto flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Preview Emergency Card
          </a>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Emergency profile settings saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Emergency Contacts */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Phone className="w-4 h-4 text-sky-600" />
              Emergency Contacts
            </h3>
            <button
              type="button"
              onClick={addContact}
              className="btn-secondary text-xs py-1 px-2.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Contact
            </button>
          </div>

          {contacts.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">No emergency contacts added yet.</p>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <input
                    type="text"
                    required
                    placeholder="Contact Name (e.g. Jane Doe)"
                    value={contact.name}
                    onChange={(e) => updateContact(idx, 'name', e.target.value)}
                    className="input-field text-xs bg-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Relationship (e.g. Spouse, Parent)"
                    value={contact.relationship}
                    onChange={(e) => updateContact(idx, 'relationship', e.target.value)}
                    className="input-field text-xs bg-white"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      required
                      placeholder="Phone (+1 555-0199)"
                      value={contact.phone}
                      onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                      className="input-field text-xs bg-white flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeContact(idx)}
                      className="p-1 rounded text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Known Allergies */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            Critical Allergies
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              value={allergyInput}
              onChange={(e) => setAllergyInput(e.target.value)}
              placeholder="e.g. Penicillin, Peanuts, Latex"
              className="input-field text-xs flex-1"
            />
            <button
              type="button"
              onClick={addAllergy}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Add Allergy
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {allergies.map((allergy, idx) => (
              <span key={idx} className="badge bg-red-50 text-red-700 border border-red-200 text-xs py-1 px-2.5 flex items-center gap-1.5">
                {allergy}
                <button type="button" onClick={() => removeAllergy(idx)} className="hover:text-red-900">
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Selected Emergency Medications */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-sky-600" />
            Select Active Medications to Display
          </h3>
          <p className="text-xs text-slate-500">Only selected medications appear on the emergency card.</p>

          <div className="space-y-2">
            {treatments.map((t) => {
              const name = t.prescriptionItem?.enteredMedicationName || t.customMedicationName || 'Medication';
              return (
                <label key={t.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMedIds.includes(t.id)}
                    onChange={() => toggleMedication(t.id)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="font-semibold text-slate-800">{name}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Emergency Medical Notes */}
        <div className="card p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Emergency Notes (Blood group, chronic conditions, implants)
          </h3>
          <textarea
            rows={3}
            value={medicalNotes}
            onChange={(e) => setMedicalNotes(e.target.value)}
            placeholder="e.g. Type 1 Diabetic, Has Pacemaker implanted in 2024, Blood group O+"
            className="input-field text-xs"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary text-xs py-2 px-5 shadow-sm"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Emergency Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
