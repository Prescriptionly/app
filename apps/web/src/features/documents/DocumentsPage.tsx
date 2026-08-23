import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../services/auth-context';
import { api } from '../../services/api-client';
import {
  FileText,
  Upload,
  Search,
  Filter,
  Eye,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const DocumentsPage: React.FC = () => {
  const { activeProfile } = useAuth();
  const [documents, setDocuments] = useState<Array<{
    id: string;
    title: string;
    category: string;
    status: string;
    notes?: string | null;
    createdAt: string;
    versions: Array<{
      id: string;
      fileName: string;
      fileSizeBytes: number;
      mimeType: string;
      versionNumber: number;
      extractions: Array<{
        id: string;
        status: string;
        isConfirmed: boolean;
      }>;
    }>;
  }>>([]);

  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Upload Form State
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('PRESCRIPTION');
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!activeProfile) return;
    setIsLoading(true);
    try {
      const data = await api.get<typeof documents>('/api/v1/documents', {
        patientProfileId: activeProfile.id,
        category: categoryFilter || undefined,
        search: search || undefined,
      });
      setDocuments(data);
    } catch (err) {
      console.error('Error loading documents', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile, categoryFilter, search]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !activeProfile) return;
    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientProfileId', activeProfile.id);
    formData.append('title', title || file.name);
    formData.append('category', category);
    if (notes) formData.append('notes', notes);

    try {
      await api.post('/api/v1/documents/upload', formData);
      setUploadModalOpen(false);
      setFile(null);
      setTitle('');
      setNotes('');
      loadDocuments();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Medical Document Vault</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Preserve original medical prescriptions, lab reports, and clinical evidence.
          </p>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="btn-primary text-xs py-2 px-4 shadow-sm"
        >
          <Upload className="w-4 h-4" />
          Upload New Document
        </button>
      </div>

      {/* Filters & Search */}
      <div className="card p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by title..."
            className="input-field pl-9 text-xs py-2"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field text-xs py-2 w-full sm:w-48"
          >
            <option value="">All Categories</option>
            <option value="PRESCRIPTION">Prescription</option>
            <option value="LAB_REPORT">Lab Report</option>
            <option value="IMAGING_REPORT">Imaging Report</option>
            <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
            <option value="DOCTOR_LETTER">Doctor Letter</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-700">No documents found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload your prescriptions or medical reports to preserve original evidence and extract medication data.
          </p>
          <button onClick={() => setUploadModalOpen(true)} className="btn-primary text-xs py-1.5 px-3.5">
            Upload First Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const latestVersion = doc.versions[0];
            const extraction = latestVersion?.extractions[0];
            return (
              <div key={doc.id} className="card p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="badge badge-prescribed text-[10px]">{doc.category}</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1 mb-1">{doc.title}</h3>
                  {doc.notes && <p className="text-xs text-slate-500 line-clamp-2 mb-3">{doc.notes}</p>}

                  <div className="text-[11px] text-slate-400 space-y-0.5 mt-2">
                    <p>File: {latestVersion?.fileName || 'evidence'}</p>
                    <p>Size: {latestVersion ? Math.round(latestVersion.fileSizeBytes / 1024) : 0} KB</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {extraction ? (
                    extraction.isConfirmed ? (
                      <span className="badge badge-reported text-[10px]">Confirmed Rx</span>
                    ) : extraction.status === 'EXTRACTED' ? (
                      <Link
                        to={`/ocr/review/${extraction.id}`}
                        className="btn-primary text-[10px] py-1 px-2.5 bg-amber-600 hover:bg-amber-700 font-semibold"
                      >
                        <Sparkles className="w-3 h-3" />
                        Review Draft
                      </Link>
                    ) : (
                      <span className="badge bg-slate-100 text-slate-600 text-[10px]">Processing OCR...</span>
                    )
                  ) : (
                    <span className="text-[10px] text-slate-400">Original Only</span>
                  )}

                  <Link
                    to={`/documents/${doc.id}`}
                    className="btn-secondary text-xs py-1 px-2.5 text-slate-700 hover:text-sky-600"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="card w-full max-w-lg p-6 shadow-xl relative animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Upload Medical Document</h3>
            <p className="text-xs text-slate-500 mb-4">Original files are stored securely and permanently preserved.</p>

            {uploadError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select File (PDF, PNG, JPG)</label>
                <input
                  type="file"
                  required
                  accept="image/*,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="input-field text-xs file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Dr. Jenkins Prescription - May 2026"
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-field text-xs"
                >
                  <option value="PRESCRIPTION">Doctor Prescription</option>
                  <option value="LAB_REPORT">Laboratory Report</option>
                  <option value="IMAGING_REPORT">Imaging Report (X-Ray / MRI)</option>
                  <option value="DISCHARGE_SUMMARY">Hospital Discharge Summary</option>
                  <option value="DOCTOR_LETTER">Doctor Letter / Referral</option>
                  <option value="OTHER">Other Clinical Document</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional context or notes..."
                  className="input-field text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !file}
                  className="btn-primary text-xs"
                >
                  {isUploading ? 'Uploading & Enqueueing OCR...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
