'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'parris_tutor_history';
const MAX_STORED = 50;

export function TutorChat() {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

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
  }

  const isLoading = status === 'streaming' || status === 'submitted';

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
          <p className="text-xs text-slate-400">Victorian Curriculum & VCE aligned</p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="flex items-center gap-1 text-xs text-slate-400" role="status" aria-live="polite">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Thinking…
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
              Ask your tutor anything — try{' '}
              <button
                onClick={() => setInput('Explain operationalising variables in Psychology research methods')}
                className="text-slate-700 underline underline-offset-2 hover:text-slate-900"
                aria-label='Use example prompt: Explain operationalising variables'
              >
                &ldquo;Explain operationalising variables&rdquo;
              </button>{' '}
              or{' '}
              <button
                onClick={() => setInput('Justify the best pricing strategy for a student-run cafe')}
                className="text-slate-700 underline underline-offset-2 hover:text-slate-900"
                aria-label='Use example prompt: Pricing strategy for a student cafe'
              >
                &ldquo;Pricing strategy for a student cafe&rdquo;
              </button>
            </p>
          </div>
        )}

        {messages.map(m => (
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
              {m.parts.map((p, i) =>
                p.type === 'text' ? (
                  <span key={i}>{p.text}</span>
                ) : null
              )}
            </div>
            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5" aria-hidden="true">
                Y
              </div>
            )}
          </div>
        ))}

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

      {/* Input */}
      <div className="border-t px-5 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !isLoading) {
              setError('');
              sendMessage({ text: input });
              setInput('');
            }
          }}
          className="flex gap-2"
          aria-label="Send a message to the tutor"
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask the tutor…"
            disabled={isLoading}
            className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
            aria-label="Your message to the tutor"
            aria-disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
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
