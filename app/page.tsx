'use client';
import { TutorChat } from './tutor-chat';
import { useState } from 'react';

const SUBJECTS = [
  { id: 'psychology', name: 'VCE Psychology Unit 1', level: 'Year 11 extension', color: 'bg-purple-100 text-purple-900', focus: ['Research methods', 'Lifespan development', 'Mental processes', 'Biopsychosocial model'] },
  { id: 'maths', name: 'General Mathematics', level: 'Year 10 Victorian Curriculum', color: 'bg-blue-100 text-blue-900', focus: ['Number & algebra', 'Measurement & geometry', 'Statistics & probability', 'Mathematical modelling'] },
  { id: 'science', name: 'Advanced Science', level: 'Year 10 extension', color: 'bg-green-100 text-green-900', focus: ['Scientific inquiry skills', 'Physical sciences', 'Chemical sciences', 'Biological sciences'] },
  { id: 'english', name: 'English', level: 'Year 10 Victorian Levels 9-10', color: 'bg-amber-100 text-amber-900', focus: ['Analysing texts', 'Creating texts', 'Language conventions', 'Oral communication'] },
  { id: 'entrepreneurship', name: 'Entrepreneurship', level: 'Economics & Business Year 10', color: 'bg-rose-100 text-rose-900', focus: ['Enterprise decision-making', 'Business risk & reward', 'Resource use', 'Justification with criteria'] },
];

const TABS = ['Dashboard', 'Subjects', 'Quizzes', 'Assessments', 'Tutor', 'Progress'];

export default function Home() {
  const [tab, setTab] = useState('Dashboard');
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Parris Study Platform</h1>
            <p className="text-sm text-slate-500">Victorian Curriculum + VCE Psychology Unit 1</p>
          </div>
          <span className="text-sm text-slate-500">Year 10 core + Psychology extension</span>
        </div>
        <nav className="mx-auto max-w-6xl px-6 flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm border-b-2 ${tab===t?'border-slate-900 text-slate-900 font-medium':'border-transparent text-slate-500 hover:text-slate-900'}`}>{t}</button>
          ))}
        </nav>
      </header>
      <section className="mx-auto max-w-6xl px-6 py-8">
        {tab==='Dashboard' && (
          <div className="grid md:grid-cols-3 gap-4">
            <Card title="Next best action" body="Complete Psychology research methods diagnostic to map weak areas." cta="Start" />
            <Card title="Today's focus" body="English analysis paragraph + Maths algebra foundation." cta="Open" />
            <Card title="Upload test" body="Upload a recent assessment for tutor analysis and intervention plan." cta="Upload" />
          </div>
        )}
        {tab==='Subjects' && (
          <div className="grid md:grid-cols-2 gap-4">
            {SUBJECTS.map(s => (
              <div key={s.id} className="rounded-2xl border bg-white p-5">
                <div className={`inline-block text-xs px-2 py-1 rounded-full ${s.color}`}>{s.level}</div>
                <h3 className="text-lg font-semibold mt-2">{s.name}</h3>
                <ul className="mt-3 text-sm text-slate-600 list-disc pl-5 space-y-1">
                  {s.focus.map(f => <li key={f}>{f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
        {tab==='Quizzes' && <Empty text="Adaptive quizzes by subject and difficulty. Connect OPENAI_API_KEY to enable AI question generation." />}
        {tab==='Assessments' && <Empty text="Upload test results and teacher comments. Weak areas are auto-tagged to syllabus strands." />}
        {tab==='Tutor' && <TutorChat />}
        {tab==='Progress' && <Empty text="Mastery map and achievement + progress view across all subjects." />}
      </section>
    </main>
  );
}
function Card({title, body, cta}:{title:string;body:string;cta:string}){return(<div className="rounded-2xl border bg-white p-5"><h3 className="font-semibold">{title}</h3><p className="text-sm text-slate-600 mt-2">{body}</p><button className="mt-4 text-sm font-medium px-3 py-1.5 rounded-lg bg-slate-900 text-white">{cta}</button></div>);}
function Empty({text}:{text:string}){return(<div className="rounded-2xl border bg-white p-10 text-center text-slate-500">{text}</div>);}
