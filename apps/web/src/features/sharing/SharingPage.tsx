import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../services/auth-context';
import { api } from '../../services/api-client';
import {
  Plus,
  XCircle,
  Copy,
  Check,
} from 'lucide-react';

export const SharingPage: React.FC = () => {
  const { activeProfile } = useAuth();
  const [grants, setGrants] = useState<Array<{
    id: string;
    recipientLabel: string;
    allowedCategoriesJson: string;
    expiresAt: string;
    revokedAt?: string | null;
    accessCount: number;
    lastAccessedAt?: string | null;
    createdAt: string;
  }>>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form State
  const [recipientLabel, setRecipientLabel] = useState('');
  const [categories, setCategories] = useState<string[]>(['MEDICATIONS', 'HISTORY']);
  const [expiresInHours, setExpiresInHours] = useState(48);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadGrants = useCallback(async () => {
    if (!activeProfile) return;
    setIsLoading(true);
    try {
      const data = await api.get<typeof grants>('/api/v1/sharing', {
        patientProfileId: activeProfile.id,
      });
      setGrants(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    loadGrants();
  }, [loadGrants]);

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleCreateGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile || !recipientLabel.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await api.post<{ shareToken: string; shareUrl: string }>('/api/v1/sharing', {
        patientProfileId: activeProfile.id,
        recipientLabel,
        allowedCategories: categories,
        expiresInHours,
      });

      const fullUrl = `${window.location.origin}${res.shareUrl}`;
      setCreatedShareUrl(fullUrl);
      loadGrants();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await api.post(`/api/v1/sharing/${id}/revoke`);
      loadGrants();
    } catch (err) {
      console.error(err);
    }
  };

  if (!activeProfile) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Scoped Sharing & Temporary Access</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Share explicitly selected categories with clinicians or caregivers via expiring, revocable links.
          </p>
        </div>

        <button
          onClick={() => {
            setCreatedShareUrl(null);
            setModalOpen(true);
          }}
          className="btn-primary text-xs py-2 px-4 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Share Link
        </button>
      </div>

      <div className="card p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Active & Past Share Grants</h3>

        {isLoading ? (
          <p className="text-xs text-slate-400 py-6 text-center">Loading share grants...</p>
        ) : grants.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No active share links. Create one above.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {grants.map((g) => {
              const cats: string[] = JSON.parse(g.allowedCategoriesJson || '[]');
              const isExpired = new Date(g.expiresAt) < new Date();
              const isRevoked = !!g.revokedAt;
              const isActive = !isExpired && !isRevoked;

              return (
                <div key={g.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900">{g.recipientLabel}</span>
                      <span
                        className={`badge text-[10px] ${
                          isActive
                            ? 'badge-reported'
                            : isRevoked
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active Link'}
                      </span>
                    </div>

                    <p className="text-slate-500 text-[11px]">
                      Categories: {cats.join(', ')} • Accessed {g.accessCount} time(s)
                    </p>

                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Expires: {new Date(g.expiresAt).toLocaleString()}
                    </p>
                  </div>

                  {isActive && (
                    <button
                      onClick={() => handleRevoke(g.id)}
                      className="btn-secondary text-[11px] py-1 px-2.5 text-red-600 hover:bg-red-50 border-red-200 self-start sm:self-auto"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Revoke Access
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="card w-full max-w-lg p-6 shadow-xl relative animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Generate Scoped Share Link</h3>
            <p className="text-xs text-slate-500 mb-4">Never exposes your full wallet; only selected data categories.</p>

            {createdShareUrl ? (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Share link generated successfully!
                  </p>
                  <p className="text-[11px] font-mono break-all bg-white p-2 rounded border border-emerald-200 text-slate-800">
                    {createdShareUrl}
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdShareUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied to clipboard' : 'Copy Link'}
                  </button>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateGrant} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Recipient Label / Purpose</label>
                  <input
                    type="text"
                    required
                    value={recipientLabel}
                    onChange={(e) => setRecipientLabel(e.target.value)}
                    placeholder="e.g. Dr. Adams Cardiology Consult"
                    className="input-field text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-2">Select Data Categories to Include</label>
                  <div className="space-y-2">
                    {[
                      { id: 'MEDICATIONS', label: 'Current Active Medications & Regimens' },
                      { id: 'HISTORY', label: 'Medication Event History (Taken & Skipped)' },
                      { id: 'DOCUMENTS', label: 'Uploaded Medical Documents Metadata' },
                      { id: 'SYMPTOMS', label: 'Reported Symptoms & Observations' },
                    ].map((cat) => (
                      <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={categories.includes(cat.id)}
                          onChange={() => toggleCategory(cat.id)}
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <span className="text-slate-700">{cat.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Link Expiration</label>
                  <select
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(parseInt(e.target.value))}
                    className="input-field text-xs"
                  >
                    <option value={24}>24 Hours</option>
                    <option value={48}>48 Hours (2 days)</option>
                    <option value={168}>7 Days</option>
                    <option value={720}>30 Days</option>
                  </select>
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
                    disabled={isSubmitting || categories.length === 0}
                    className="btn-primary text-xs"
                  >
                    {isSubmitting ? 'Generating...' : 'Generate Scoped Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
