import React, { useState, useEffect } from 'react';
import { useAuth } from '../../services/auth-context';
import { api } from '../../services/api-client';
import {
  Sparkles,
  Send,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface GroundedResponse {
  documentId: string;
  documentTitle: string;
  query: string;
  groundedFacts: string[];
  explanation: string;
  notPresentStatements: string[];
  disclaimer: string;
}

export const AiAssistantPage: React.FC = () => {
  const { activeProfile } = useAuth();
  const [documents, setDocuments] = useState<Array<{ id: string; title: string; category: string }>>([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [question, setQuestion] = useState('');
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isAsking, setIsAsking] = useState(false);
  const [result, setResult] = useState<GroundedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfile) return;
    setIsLoadingDocs(true);
    api
      .get<typeof documents>('/api/v1/documents', { patientProfileId: activeProfile.id })
      .then((docs) => {
        setDocuments(docs);
        if (docs.length > 0) setSelectedDocId(docs[0]!.id);
      })
      .catch(console.error)
      .finally(() => setIsLoadingDocs(false));
  }, [activeProfile]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId || !question.trim()) return;
    setIsAsking(true);
    setError(null);
    try {
      const res = await api.post<GroundedResponse>('/api/v1/ai-assistant/ask', {
        documentId: selectedDocId,
        question,
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to get document response');
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">AI Document Assistant</h2>
          <span className="badge bg-purple-100 text-purple-800 text-[10px]">Phase 2</span>
        </div>
        <p className="text-xs text-slate-500">
          Ask questions grounded strictly in a selected medical document. Answers distinguish document facts, terminology explanations, and absent information.
        </p>
      </div>

      <div className="card p-6 space-y-5">
        <form onSubmit={handleAsk} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Grounding Document</label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="input-field text-xs"
              disabled={isLoadingDocs || documents.length === 0}
            >
              {documents.length === 0 ? (
                <option value="">No documents available. Upload a document first.</option>
              ) : (
                documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.category})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ask a Question About this Document</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. What dosage instructions were written? What medical terminology is used?"
                className="input-field text-xs flex-1"
                disabled={documents.length === 0}
              />
              <button
                type="submit"
                disabled={isAsking || documents.length === 0}
                className="btn-primary text-xs py-2 px-4 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                {isAsking ? 'Analyzing...' : 'Ask Assistant'}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="mt-6 pt-6 border-t border-slate-100 space-y-4 animate-in fade-in duration-150 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-sm">Grounded Analysis Result</span>
              <span className="text-slate-500 text-[11px]">Document: {result.documentTitle}</span>
            </div>

            {/* 1. From Document Section */}
            <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sky-900">
                <CheckCircle className="w-4 h-4 text-sky-700 shrink-0" />
                <span>FROM THE DOCUMENT (Grounded Evidence)</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-sky-950 font-medium">
                {result.groundedFacts.map((fact, idx) => (
                  <li key={idx}>{fact}</li>
                ))}
              </ul>
            </div>

            {/* 2. AI Explanation Section */}
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-purple-900">
                <Sparkles className="w-4 h-4 text-purple-700 shrink-0" />
                <span>AI EXPLANATION & CONTEXT</span>
              </div>
              <p className="text-purple-950 leading-relaxed">{result.explanation}</p>
            </div>

            {/* 3. Not Present in Document Section */}
            {result.notPresentStatements.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-100 border border-slate-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                  <span>NOT PRESENT IN THIS DOCUMENT</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  {result.notPresentStatements.map((stmt, idx) => (
                    <li key={idx}>{stmt}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-[11px] text-slate-400 italic text-center pt-2">{result.disclaimer}</p>
          </div>
        )}
      </div>
    </div>
  );
};
