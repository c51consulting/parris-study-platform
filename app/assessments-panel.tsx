'use client';
import { useState, useRef } from 'react';

interface AssessmentResult {
  filename: string;
  score?: number;
  maxScore?: number;
  percentage?: number;
  weakAreas: string[];
  strengths: string[];
  teacherNotes?: string;
  syllabusStrands: string[];
  recommendations: string[];
  status: string;
}

interface UploadedAssessment {
  id: string;
  filename: string;
  uploadedAt: string;
  result?: AssessmentResult;
}

export function AssessmentsPanel() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [assessments, setAssessments] = useState<UploadedAssessment[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('parris_assessments') || '[]');
    } catch {
      return [];
    }
  });
  const [teacherNotes, setTeacherNotes] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const SUBJECTS = [
    { id: 'psych-u1', name: 'VCE Psychology Unit 1' },
    { id: 'math10', name: 'General Mathematics' },
    { id: 'science10', name: 'Advanced Science' },
    { id: 'english10', name: 'English' },
    { id: 'ecobiz10', name: 'Entrepreneurship' },
  ];

  function saveAssessments(updated: UploadedAssessment[]) {
    setAssessments(updated);
    localStorage.setItem('parris_assessments', JSON.stringify(updated));
  }

  async function handleFile(file: File) {
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'];
    if (!allowed.includes(file.type)) {
      setError('Unsupported file type. Please upload a PDF, image (JPG/PNG), or text file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10 MB.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      if (teacherNotes) form.append('teacherNotes', teacherNotes);
      if (selectedSubject) form.append('subject', selectedSubject);

      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed (${res.status})`);
      }
      const data = await res.json();

      const newEntry: UploadedAssessment = {
        id: crypto.randomUUID(),
        filename: file.name,
        uploadedAt: new Date().toISOString(),
        result: data.analysis ?? undefined,
      };
      saveAssessments([newEntry, ...assessments]);
      setTeacherNotes('');
      setSelectedSubject('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function removeAssessment(id: string) {
    saveAssessments(assessments.filter(a => a.id !== id));
  }

  return (
    <div className="space-y-6" role="region" aria-label="Assessments">
      {/* Upload card */}
      <div className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-semibold mb-1">Upload Assessment</h2>
        <p className="text-sm text-slate-500 mb-4">
          Upload a test, assignment, or exam result. Weak areas will be auto-tagged to VCAA syllabus strands and an intervention plan will be generated.
        </p>

        <div className="space-y-3 mb-4">
          <div>
            <label htmlFor="assessment-subject" className="block text-sm font-medium text-slate-700 mb-1">
              Subject <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <select
              id="assessment-subject"
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
              aria-label="Select subject for assessment"
            >
              <option value="">— Auto-detect —</option>
              {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="teacher-notes" className="block text-sm font-medium text-slate-700 mb-1">
              Teacher comments <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="teacher-notes"
              value={teacherNotes}
              onChange={e => setTeacherNotes(e.target.value)}
              placeholder="e.g. Struggled with hypothesis formation, good on data analysis…"
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-400"
              aria-label="Teacher comments about this assessment"
            />
          </div>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragOver ? 'border-slate-500 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}
          role="button"
          aria-label="Drop zone for file upload"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
        >
          <svg className="mx-auto h-10 w-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-slate-600 mb-1">Drag & drop your file here, or</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-sm font-medium text-slate-900 underline underline-offset-2 hover:text-slate-600"
            aria-label="Browse to select a file"
          >
            browse to select
          </button>
          <p className="text-xs text-slate-400 mt-2">PDF, JPG, PNG, or TXT · max 10 MB</p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            aria-label="File input"
          />
        </div>

        {uploading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600" role="status" aria-live="polite">
            <svg className="animate-spin h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Uploading and analysing…
          </div>
        )}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
            {error}
          </div>
        )}
      </div>

      {/* History */}
      {assessments.length > 0 && (
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Upload History</h2>
          <div className="space-y-4">
            {assessments.map(a => (
              <div key={a.id} className="border rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{a.filename}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(a.uploadedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={() => removeAssessment(a.id)}
                    className="text-slate-300 hover:text-red-400 transition-colors text-xs"
                    aria-label={`Remove ${a.filename}`}
                  >
                    ✕
                  </button>
                </div>
                {a.result && (
                  <div className="mt-3 space-y-2">
                    {a.result.percentage !== undefined && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2" role="progressbar" aria-valuenow={a.result.percentage} aria-valuemin={0} aria-valuemax={100}>
                          <div
                            className={`h-2 rounded-full ${a.result.percentage >= 70 ? 'bg-green-500' : a.result.percentage >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${a.result.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600 w-10 text-right">{a.result.percentage}%</span>
                      </div>
                    )}
                    {a.result.weakAreas.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Weak areas</p>
                        <div className="flex flex-wrap gap-1">
                          {a.result.weakAreas.map(w => (
                            <span key={w} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{w}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {a.result.syllabusStrands.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Syllabus strands</p>
                        <div className="flex flex-wrap gap-1">
                          {a.result.syllabusStrands.map(s => (
                            <span key={s} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {a.result.recommendations.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Recommendations</p>
                        <ul className="text-xs text-slate-600 list-disc pl-4 space-y-0.5">
                          {a.result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {!a.result && (
                  <p className="text-xs text-slate-400 mt-2 italic">Analysis pending…</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
