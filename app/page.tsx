'use client';
import { TutorChat } from './tutor-chat';
import { QuizPanel } from './quiz-panel';
import { AssessmentsPanel } from './assessments-panel';
import { ProgressPanel } from './progress-panel';
import { PasswordGate } from './password-gate';
import { useState, useEffect } from 'react';

const SUBJECTS = [
  { id: 'psychology', name: 'VCE Psychology Unit 1', level: 'Year 11 extension', color: 'bg-purple-100 text-purple-900', focus: ['Research methods', 'Lifespan development', 'Mental processes', 'Biopsychosocial model'] },
  { id: 'maths', name: 'General Mathematics', level: 'Year 10 Victorian Curriculum', color: 'bg-blue-100 text-blue-900', focus: ['Number & algebra', 'Measurement & geometry', 'Statistics & probability', 'Mathematical modelling'] },
  { id: 'science', name: 'Advanced Science', level: 'Year 10 extension', color: 'bg-green-100 text-green-900', focus: ['Scientific inquiry skills', 'Physical sciences', 'Chemical sciences', 'Biological sciences'] },
  { id: 'english', name: 'English', level: 'Year 10 Victorian Levels 9-10', color: 'bg-amber-100 text-amber-900', focus: ['Analysing texts', 'Creating texts', 'Language conventions', 'Oral communication'] },
  { id: 'entrepreneurship', name: 'Entrepreneurship', level: 'Economics & Business Year 10', color: 'bg-rose-100 text-rose-900', focus: ['Enterprise decision-making', 'Business risk & reward', 'Resource use', 'Justification with criteria'] },
];

const TABS = ['Dashboard', 'Subjects', 'Quizzes', 'Assessments', 'Tutor', 'Progress'] as const;
type Tab = typeof TABS[number];

export default function Home() {
  const [tab, setTab] = useState<Tab>('Dashboard');

  // Persist active tab across sessions
  useEffect(() => {
    try {
      const saved = localStorage.getItem('parris_active_tab') as Tab | null;
      if (saved && TABS.includes(saved)) setTab(saved);
    } catch { /* ignore */ }
  }, []);

  function navigate(t: Tab) {
    setTab(t);
    try { localStorage.setItem('parris_active_tab', t); } catch { /* ignore */ }
  }

  return (
    <PasswordGate>
      {/* Skip navigation link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-lg focus:text-sm"
      >
        Skip to main content
      </a>

      <main className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b bg-white sticky top-0 z-10" role="banner">
          <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Parris Study Platform</h1>
              <p className="text-sm text-slate-500">Victorian Curriculum + VCE Psychology Unit 1</p>
            </div>
            <span className="text-sm text-slate-500 hidden sm:block">Year 10 core + Psychology extension</span>
          </div>
          <nav
            className="mx-auto max-w-6xl px-6 flex gap-1 overflow-x-auto"
            role="navigation"
            aria-label="Main navigation"
          >
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => navigate(t)}
                className={`px-4 py-2 text-sm border-b-2 whitespace-nowrap transition-colors ${tab === t ? 'border-slate-900 text-slate-900 font-medium' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                aria-current={tab === t ? 'page' : undefined}
                aria-label={`Navigate to ${t}`}
              >
                {t}
              </button>
            ))}
          </nav>
        </header>

        <section
          id="main-content"
          className="mx-auto max-w-6xl px-6 py-8"
          role="main"
          aria-label={`${tab} section`}
        >
          {tab === 'Dashboard' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Welcome back</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <DashboardCard
                  title="Next best action"
                  body="Complete the Psychology research methods diagnostic to map your weak areas."
                  cta="Start Quiz"
                  icon="🧠"
                  onClick={() => navigate('Quizzes')}
                />
                <DashboardCard
                  title="Today's focus"
                  body="English analysis paragraph + Maths algebra foundation — ask the AI tutor for help."
                  cta="Open Tutor"
                  icon="💬"
                  onClick={() => navigate('Tutor')}
                />
                <DashboardCard
                  title="Upload a test"
                  body="Upload a recent assessment for AI analysis, syllabus tagging, and an intervention plan."
                  cta="Upload Now"
                  icon="📄"
                  onClick={() => navigate('Assessments')}
                />
              </div>

              <div className="mt-8 grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl border bg-white p-5">
                  <h3 className="font-semibold mb-3 text-sm text-slate-500 uppercase tracking-wide">Your Subjects</h3>
                  <div className="space-y-2">
                    {SUBJECTS.map(s => (
                      <div key={s.id} className="flex items-center gap-3">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${s.color}`}>{s.level}</span>
                        <span className="text-sm font-medium text-slate-800">{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border bg-white p-5">
                  <h3 className="font-semibold mb-3 text-sm text-slate-500 uppercase tracking-wide">Quick Actions</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Take a quiz', tab: 'Quizzes' as Tab, icon: '🧠' },
                      { label: 'Ask the AI tutor', tab: 'Tutor' as Tab, icon: '💬' },
                      { label: 'Upload an assessment', tab: 'Assessments' as Tab, icon: '📄' },
                      { label: 'View my progress', tab: 'Progress' as Tab, icon: '📊' },
                    ].map(action => (
                      <button
                        key={action.label}
                        onClick={() => navigate(action.tab)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-left transition-colors"
                        aria-label={action.label}
                      >
                        <span aria-hidden="true">{action.icon}</span>
                        <span className="text-sm text-slate-700">{action.label}</span>
                        <span className="ml-auto text-slate-300 text-xs">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'Subjects' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Your Subjects</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {SUBJECTS.map(s => (
                  <div key={s.id} className="rounded-2xl border bg-white p-5">
                    <div className={`inline-block text-xs px-2 py-1 rounded-full ${s.color}`}>{s.level}</div>
                    <h3 className="text-lg font-semibold mt-2">{s.name}</h3>
                    <ul className="mt-3 text-sm text-slate-600 list-disc pl-5 space-y-1" aria-label={`Topics in ${s.name}`}>
                      {s.focus.map(f => <li key={f}>{f}</li>)}
                    </ul>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => navigate('Quizzes')}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors"
                        aria-label={`Take a quiz on ${s.name}`}
                      >
                        Quiz me
                      </button>
                      <button
                        onClick={() => navigate('Tutor')}
                        className="text-xs px-3 py-1.5 rounded-lg border hover:bg-slate-50 transition-colors"
                        aria-label={`Ask tutor about ${s.name}`}
                      >
                        Ask tutor
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'Quizzes' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Adaptive Quizzes</h2>
              <QuizPanel />
            </div>
          )}

          {tab === 'Assessments' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Assessments</h2>
              <AssessmentsPanel />
            </div>
          )}

          {tab === 'Tutor' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">AI Tutor</h2>
              <TutorChat />
            </div>
          )}

          {tab === 'Progress' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">My Progress</h2>
              <ProgressPanel />
            </div>
          )}
        </section>
      </main>
    </PasswordGate>
  );
}

function DashboardCard({
  title,
  body,
  cta,
  icon,
  onClick,
}: {
  title: string;
  body: string;
  cta: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="text-2xl mb-2" aria-hidden="true">{icon}</div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-600 mt-2">{body}</p>
      <button
        onClick={onClick}
        className="mt-4 text-sm font-medium px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors"
        aria-label={cta}
      >
        {cta}
      </button>
    </div>
  );
}
