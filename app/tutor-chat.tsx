'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'parris_tutor_history';
const MAX_STORED = 50;

interface StagedFile {
  filename: string;
  text: string;
  type: string;
}

export function TutorChat() {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [stagedFile, setStagedFile] = useState<StagedFile | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: '/api/tutor' }),
    onError: (err) => {
      setError(err?.message ?? 'The tutor encountered an error. Please try again.');
    },
  });

  // Restore chat history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save chat history to localStorage when messages change
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      const toStore = messages.slice(-MAX_STORED);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch { /* ignore */ }
  }, [messages]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function clearHistory() {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    setError('');
    setStagedFile(null);
    setFileError('');
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so same file can be re-selected after removal
    e.target.value = '';
    if (!file) return;

    setFileError('');
    setFileLoading(true);
    setStagedFile(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/tutor-upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setFileError(data.error ?? 'Could not read the file. Please try again.');
      } else {
        setStagedFile({ filename: data.filename, text: data.text, type: data.type });
      }
    } catch {
      setFileError('Network error while reading the file. Please try again.');
    } finally {
      setFileLoading(false);
    }
  }

  function removeStagedFile() {
    setStagedFile(null);
    setFileError('');
  }

  const isLoading = status === 'streaming' || status === 'submitted';

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if ((!trimmed && !stagedFile) || isLoading) return;

    setError('');

    // Build the message: if a file is staged, prepend its extracted content
    // as a labelled context block. The tutor reads it as conversation context —
    // no assessment analysis or grading is triggered.
    let messageText = trimmed;
    if (stagedFile) {
      const header = `[Attached file: ${stagedFile.filename}]\n\`\`\`\n${stagedFile.text}\n\`\`\``;
      messageText = trimmed
        ? `${header}\n\n${trimmed}`
        : `${header}\n\nPlease read the attached file and help me understand or improve it.`;
      setStagedFile(null);
    }

    sendMessage({ text: messageText });
    setInput('');
  }

  return (
    <div
      className="rounded-2xl border bg-white flex flex-col h-[580px]"
      role="region"
      aria-label="AI Tutor chat"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b">
        <div>
          <p className="text-sm font-medium text-slate-800">AI Tutor</p>
          <p className="text-xs text-slate-400">Victorian Curriculum &amp; VCE aligned</p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="flex items-center gap-1 text-xs text-slate-400" role="status" aria-live="polite">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Thinking&hellip;
            </span>
          )}
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-xs text-slate-400 hover:text-red-400 transition-colors"
              aria-label="Clear chat history"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-3xl mb-3" aria-hidden="true">💬</div>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Ask your tutor anything &mdash; try{' '}
              <button
                onClick={() => setInput('Explain operationalising variables in Psychology research methods')}
                className="text-slate-700 underline underline-offset-2 hover:text-slate-900"
                aria-label="Use example prompt: Explain operationalising variables"
              >
                &ldquo;Explain operationalising variables&rdquo;
              </button>{' '}
              or{' '}
              <button
                onClick={() => setInput('Justify the best pricing strategy for a student-run cafe')}
                className="text-slate-700 underline underline-offset-2 hover:text-slate-900"
                aria-label="Use example prompt: Pricing strategy for a student cafe"
              >
                &ldquo;Pricing strategy for a student cafe&rdquo;
              </button>
            </p>
            <p className="text-xs text-slate-400 mt-3">
              You can also attach a file (PDF, image, or text) using the{' '}
              <span aria-hidden="true">📎</span> button below.
            </p>
          </div>
        )}

        {messages.map(m => {
          const parts = m.parts ?? [];
          return (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              role="article"
              aria-label={`${m.role === 'user' ? 'You' : 'Tutor'}: message`}
            >
              {m.role !== 'user' && (
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5" aria-hidden="true">
                  T
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-slate-900 text-white rounded-br-sm'
                    : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                }`}
              >
                {parts.map((p, i) => {
                  if (p.type !== 'text') return null;
                  const rawText = (p as { type: 'text'; text: string }).text;

                  // Detect attached-file messages and render a compact badge
                  // instead of showing the raw extracted text dump
                  const attachMatch = rawText.match(
                    /^\[Attached file: (.+?)\]\n```\n[\s\S]*?\n```\n?\n?([\s\S]*)$/
                  );
                  if (attachMatch) {
                    const [, fname, userMsg] = attachMatch;
                    return (
                      <span key={i}>
                        <span className="inline-flex items-center gap-1.5 bg-white/20 border border-white/30 rounded-lg px-2.5 py-1 text-xs font-medium mb-2 block w-fit">
                          <span aria-hidden="true">📎</span>
                          {fname}
                        </span>
                        {userMsg && <span className="block mt-1">{userMsg}</span>}
                      </span>
                    );
                  }

                  return <span key={i}>{rawText}</span>;
                })}
              </div>
              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5" aria-hidden="true">
                  Y
                </div>
              )}
            </div>
          );
        })}

        {error && (
          <div className="flex justify-center" role="alert">
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-xl max-w-sm text-center">
              {error}
              <button
                onClick={() => setError('')}
                className="ml-2 underline text-red-500 hover:text-red-700"
                aria-label="Dismiss error"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {/* Staged file / loading / error preview strip */}
      {(stagedFile || fileLoading || fileError) && (
        <div className="px-5 pb-2">
          {fileLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border rounded-xl px-3 py-2">
              <svg className="animate-spin h-3 w-3 text-slate-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Reading file&hellip;
            </div>
          )}
          {fileError && !fileLoading && (
            <div
              className="flex items-center justify-between gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2"
              role="alert"
            >
              <span>&#9888; {fileError}</span>
              <button
                onClick={() => setFileError('')}
                className="underline hover:text-red-800"
                aria-label="Dismiss file error"
              >
                Dismiss
              </button>
            </div>
          )}
          {stagedFile && !fileLoading && (
            <div className="flex items-center justify-between gap-2 bg-slate-50 border rounded-xl px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base flex-shrink-0" aria-hidden="true">📎</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{stagedFile.filename}</p>
                  <p className="text-xs text-slate-400">
                    {stagedFile.text.length.toLocaleString()} characters extracted &middot; ready to send
                  </p>
                </div>
              </div>
              <button
                onClick={removeStagedFile}
                className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 text-xl leading-none"
                aria-label={`Remove attached file ${stagedFile.filename}`}
              >
                &times;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Input bar */}
      <div className="border-t px-5 py-3">
        {/* Hidden native file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.csv,.jpg,.jpeg,.png,.webp,.gif"
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          onChange={handleFileChange}
        />

        <form
          onSubmit={handleSend}
          className="flex gap-2 items-center"
          aria-label="Send a message to the tutor"
        >
          {/* Paperclip / attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || fileLoading}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40 flex-shrink-0"
            aria-label="Attach a file to share with the tutor (PDF, image, or text)"
            title="Attach file"
          >
            {/* Paperclip SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={stagedFile ? 'Add a message about the file, or send as-is\u2026' : 'Ask the tutor\u2026'}
            disabled={isLoading}
            className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
            aria-label="Your message to the tutor"
            aria-disabled={isLoading}
          />
          <button
            type="submit"
            disabled={(!input.trim() && !stagedFile) || isLoading || fileLoading}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium disabled:opacity-40 hover:bg-slate-700 transition-colors"
            aria-label="Send message"
            aria-busy={isLoading}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
