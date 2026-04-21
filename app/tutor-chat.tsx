'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

export function TutorChat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/tutor' }),
  });
  return (
    <div className="rounded-2xl border bg-white p-5 flex flex-col h-[520px]">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">Ask your tutor anything — try “Explain operationalising variables in Psychology research methods” or “Justify the best pricing strategy for a student-run cafe.”</p>
        )}
        {messages.map(m => (
          <div key={m.id} className={`text-sm ${m.role==='user'?'text-slate-900':'text-slate-700'}`}>
            <span className="font-medium mr-1">{m.role==='user'?'You':'Tutor'}:</span>
            {m.parts.map((p, i) => p.type === 'text' ? <span key={i}>{p.text}</span> : null)}
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) { sendMessage({ text: input }); setInput(''); } }} className="mt-3 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask the tutor..." className="flex-1 border rounded-lg px-3 py-2 text-sm" />
        <button type="submit" disabled={status!=='ready'} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-50">Send</button>
      </form>
    </div>
  );
}
