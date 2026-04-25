'use client';
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'parris_auth';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

interface PasswordGateProps {
  children: React.ReactNode;
}

export function PasswordGate({ children }: PasswordGateProps) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { expiry } = JSON.parse(stored);
        if (Date.now() < expiry) {
          setAuthed(true);
          return;
        }
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch { /* ignore */ }
    setAuthed(false);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ expiry: Date.now() + SESSION_DURATION_MS }));
        setAuthed(true);
      } else {
        setError('Incorrect password. Please try again.');
        setPassword('');
      }
    } catch {
      setError('Unable to verify password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Loading state while checking localStorage
  if (authed === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" role="status" aria-label="Loading">
        <svg className="animate-spin h-6 w-6 text-slate-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4" role="main">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-slate-900">Parris Study Platform</h1>
            <p className="text-sm text-slate-500 mt-1">Staff access only</p>
          </div>
          <div className="bg-white rounded-2xl border p-8 shadow-sm">
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-4">
                <label htmlFor="access-password" className="block text-sm font-medium text-slate-700 mb-1">
                  Access password
                </label>
                <input
                  id="access-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  aria-describedby={error ? 'password-error' : undefined}
                  aria-invalid={!!error}
                />
              </div>
              {error && (
                <p id="password-error" className="text-sm text-red-600 mb-3" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={!password || loading}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium disabled:opacity-40 hover:bg-slate-700 transition-colors"
                aria-busy={loading}
              >
                {loading ? 'Verifying…' : 'Access Platform'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
