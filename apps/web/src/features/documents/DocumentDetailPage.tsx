import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api-client';
import {
  Download,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<{
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
      createdAt: string;
      extractions: Array<{
        id: string;
        status: string;
        isConfirmed: boolean;
        ocrText?: string | null;
        rawExtractedJson?: string | null;
        confirmedAt?: string | null;
      }>;
    }>;
    prescriptions: Array<{
      id: string;
      prescriberName?: string | null;
      clinicName?: string | null;
      prescribedDate: string;
      items: Array<{
        id: string;
        enteredMedicationName: string;
        form: string;
        strength?: string | null;
        originalInstructionText: string;
      }>;
    }>;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    api
      .get<typeof doc>(`/api/v1/documents/${id}`)
      .then(setDoc)
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return <div className="py-12 text-center text-xs text-slate-400">Loading document details...</div>;
  }

  if (!doc) {
    return (
      <div className="card p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-700">Document not found</p>
        <Link to="/documents" className="btn-secondary text-xs">
          Back to Vault
        </Link>
      </div>
    );
  }

  const latestVersion = doc.versions[0];
  const extraction = latestVersion?.extractions[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Link to="/documents" className="btn-secondary text-xs py-1.5 px-3">
          <ArrowLeft className="w-4 h-4" />
          Back to Documents
        </Link>

        <div className="flex items-center gap-2">
          {latestVersion && (
            <a
              href={`/api/v1/documents/version/${latestVersion.id}/download`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary text-xs py-1.5 px-3"
            >
              <Download className="w-3.5 h-3.5" />
              Download Original Evidence
            </a>
          )}
        </div>
      </div>

      <div className="card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-prescribed text-[10px]">{doc.category}</span>
              <span className="badge bg-slate-100 text-slate-700 text-[10px]">Status: {doc.status}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">{doc.title}</h2>
          </div>
          <div className="text-xs text-slate-400 text-left sm:text-right">
            <p>Uploaded on {new Date(doc.createdAt).toLocaleDateString()}</p>
            <p>File: {latestVersion?.fileName} ({latestVersion ? Math.round(latestVersion.fileSizeBytes / 1024) : 0} KB)</p>
          </div>
        </div>

        {doc.notes && (
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Notes:</span> {doc.notes}
          </div>
        )}

        {/* OCR / Extraction Status Card */}
        <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">OCR & Extraction Review</h3>
            </div>
            {extraction ? (
              extraction.isConfirmed ? (
                <span className="badge badge-reported text-xs">
                  <CheckCircle2 className="w-3 h-3" /> Confirmed Structured Rx
                </span>
              ) : extraction.status === 'EXTRACTED' ? (
                <Link
                  to={`/ocr/review/${extraction.id}`}
                  className="btn-primary text-xs py-1 px-3 bg-amber-600 hover:bg-amber-700 font-semibold"
                >
                  Review & Confirm Draft
                </Link>
              ) : (
                <span className="badge bg-slate-200 text-slate-700 text-xs">{extraction.status}</span>
              )
            ) : (
              <span className="text-xs text-slate-400">No extraction attached</span>
            )}
          </div>

          <p className="text-xs text-slate-500">
            OCR extracts draft candidate medications. To prevent medical errors, extraction results remain untrusted drafts until you explicitly review and confirm them.
          </p>

          {extraction?.ocrText && (
            <div className="mt-3 p-3 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
              {extraction.ocrText}
            </div>
          )}
        </div>

        {/* Linked Structured Prescriptions */}
        {doc.prescriptions && doc.prescriptions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Confirmed Structured Prescriptions from this Document</h3>
            <div className="space-y-3">
              {doc.prescriptions.map((p) => (
                <div key={p.id} className="card p-4 bg-white border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-800">
                      Prescribed: {new Date(p.prescribedDate).toLocaleDateString()} by {p.prescriberName || 'Doctor'}
                    </p>
                    <Link to="/prescriptions" className="text-xs font-medium text-sky-600 hover:underline">
                      View in Prescriptions
                    </Link>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                    {p.items.map((i) => (
                      <li key={i.id}>
                        <span className="font-semibold text-slate-800">{i.enteredMedicationName}</span> ({i.form} {i.strength || ''}) — "{i.originalInstructionText}"
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
