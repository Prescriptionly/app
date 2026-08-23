import React, { useState, useEffect } from 'react';
import { useAuth } from '../../services/auth-context';
import { api } from '../../services/api-client';
import {
  User,
  Save,
  CheckCircle2,
  Plus,
  Lock,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, activeProfile, refreshMe } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [isDobApproximate, setIsDobApproximate] = useState(false);
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN'>('UNKNOWN');
  const [bloodGroup, setBloodGroup] = useState('');
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [language, setLanguage] = useState('en');

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  // New Profile Form
  const [newProfileModalOpen, setNewProfileModalOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (activeProfile) {
      setDisplayName(activeProfile.displayName || '');
      setDateOfBirth(activeProfile.dateOfBirth ? activeProfile.dateOfBirth.split('T')[0]! : '');
      setIsDobApproximate(activeProfile.isDobApproximate);
      setGender(activeProfile.gender);
      setBloodGroup(activeProfile.bloodGroup || '');
      setTimezone(activeProfile.timezone || 'UTC');
      setLanguage(activeProfile.language || 'en');
    }
  }, [activeProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await api.patch(`/api/v1/patients/${activeProfile.id}`, {
        displayName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
        isDobApproximate,
        gender,
        bloodGroup: bloodGroup || null,
        emergencyNotes: emergencyNotes || null,
        timezone,
        language,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await refreshMe();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/v1/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setPasswordMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: unknown) {
      setPasswordMsg(err instanceof Error ? err.message : 'Password change failed');
    }
  };

  const handleCreateNewProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    try {
      await api.post('/api/v1/patients', {
        displayName: newProfileName.trim(),
        timezone,
      });
      setNewProfileModalOpen(false);
      setNewProfileName('');
      await refreshMe();
    } catch (err) {
      console.error(err);
    }
  };

  if (!user || !activeProfile) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-xs">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Patient Profile & Security Settings</h2>
        <p className="text-slate-500 mt-0.5">
          Account identity and clinical patient profiles are distinct. You can manage multiple dependent profiles under one wallet.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Patient demographics updated successfully!</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="card p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
          <User className="w-4 h-4 text-sky-600" />
          Active Patient Demographics ({activeProfile.displayName})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Display Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input-field text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as typeof gender)}
              className="input-field text-xs"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
              <option value="UNKNOWN">Prefer not to say / Unknown</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="input-field text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Blood Group</label>
            <input
              type="text"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              placeholder="e.g. O+, A-, B+"
              className="input-field text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Timezone</label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="e.g. America/New_York, UTC"
              className="input-field text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="dobApprox"
            checked={isDobApproximate}
            onChange={(e) => setIsDobApproximate(e.target.checked)}
            className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <label htmlFor="dobApprox" className="text-slate-600 font-medium">
            Date of birth is approximate (e.g. estimated birth year)
          </label>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Emergency Notes (Allergies, conditions)</label>
          <textarea
            rows={2}
            value={emergencyNotes}
            onChange={(e) => setEmergencyNotes(e.target.value)}
            placeholder="Emergency contact notes or special medical circumstances..."
            className="input-field text-xs"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary text-xs py-2 px-4 shadow-sm"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>

      {/* Multiple Patient Profiles */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-purple-600" />
            Managed Patient Profiles ({user.patientProfiles.length})
          </h3>
          <button
            onClick={() => setNewProfileModalOpen(true)}
            className="btn-secondary text-xs py-1 px-2.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Family / Dependent Profile
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {user.patientProfiles.map((p) => (
            <div
              key={p.id}
              className={`p-3.5 rounded-lg border transition-all flex items-center justify-between ${
                p.id === activeProfile.id
                  ? 'bg-sky-50 border-sky-300 font-semibold'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <span className="text-slate-900">{p.displayName}</span>
                {p.isPrimary && <span className="badge badge-prescribed text-[10px] ml-2">Primary</span>}
                <p className="text-[11px] text-slate-400 font-normal mt-0.5">Timezone: {p.timezone}</p>
              </div>

              {p.id === activeProfile.id ? (
                <span className="text-sky-700 text-xs font-bold">Active</span>
              ) : (
                <span className="text-xs text-slate-400">Switch from header</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Security & Password Change */}
      <div className="card p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
          <Lock className="w-4 h-4 text-sky-600" />
          Account Security & Password
        </h3>

        {passwordMsg && (
          <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs">
            {passwordMsg}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-3 max-w-md">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-field text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, 1 upper, 1 lower, 1 number"
              className="input-field text-xs"
            />
          </div>

          <button type="submit" className="btn-secondary text-xs py-1.5 px-3">
            Change Password
          </button>
        </form>
      </div>

      {/* Modal */}
      {newProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="card w-full max-w-md p-6 shadow-xl relative animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add New Patient Profile</h3>
            <p className="text-slate-500 text-xs mb-4">Create a distinct medical profile for a child or dependent.</p>

            <form onSubmit={handleCreateNewProfile} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Profile / Patient Name</label>
                <input
                  type="text"
                  required
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="e.g. Baby Emma Doe"
                  className="input-field text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewProfileModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
