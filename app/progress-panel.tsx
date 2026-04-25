'use client';
import { useState, useEffect } from 'react';

interface QuizRecord {
  subject: string;
  difficulty: string;
  score: number;
  total: number;
  date: string;
}

interface AssessmentRecord {
  filename: string;
  uploadedAt: string;
  result?: {
    percentage?: number;
    weakAreas: string[];
    strengths: string[];
    syllabusStrands: string[];
  };
}

const SUBJECT_LABELS: Record<string, string> = {
  'psych-u1': 'VCE Psychology Unit 1',
  'math10': 'General Mathematics',
  'science10': 'Advanced Science',
  'english10': 'English',
  'ecobiz10': 'Entrepreneurship',
};

const SUBJECT_COLORS: Record<string, string> = {
  'psych-u1': 'bg-purple-500',
  'math10': 'bg-blue-500',
  'science10': 'bg-green-500',
  'english10': 'bg-amber-500',
  'ecobiz10': 'bg-rose-500',
};

function getMasteryLevel(pct: number) {
  if (pct >= 85) return { label: 'Mastered', color: 'text-green-700 bg-green-100' };
  if (pct >= 65) return { label: 'Developing', color: 'text-amber-700 bg-amber-100' };
  if (pct >= 40) return { label: 'Emerging', color: 'text-orange-700 bg-orange-100' };
  return { label: 'Needs Work', color: 'text-red-700 bg-red-100' };
}

export function ProgressPanel() {
  const [quizHistory, setQuizHistory] = useState<QuizRecord[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);

  useEffect(() => {
    try {
      const qh = JSON.parse(localStorage.getItem('parris_quiz_history') || '[]');
      setQuizHistory(qh);
    } catch { /* ignore */ }
    try {
      const as = JSON.parse(localStorage.getItem('parris_assessments') || '[]');
      setAssessments(as);
    } catch { /* ignore */ }
  }, []);

  // Aggregate per-subject quiz stats
  const subjectStats: Record<string, { attempts: number; totalScore: number; totalQuestions: number }> = {};
  for (const q of quizHistory) {
    if (!subjectStats[q.subject]) subjectStats[q.subject] = { attempts: 0, totalScore: 0, totalQuestions: 0 };
    subjectStats[q.subject].attempts += 1;
    subjectStats[q.subject].totalScore += q.score;
    subjectStats[q.subject].totalQuestions += q.total;
  }

  const allSubjects = Object.keys(SUBJECT_LABELS);
  const hasData = quizHistory.length > 0 || assessments.length > 0;

  // Collect all weak areas from assessments
  const weakAreaCounts: Record<string, number> = {};
  for (const a of assessments) {
    for (const w of (a.result?.weakAreas ?? [])) {
      weakAreaCounts[w] = (weakAreaCounts[w] || 0) + 1;
    }
  }
  const topWeakAreas = Object.entries(weakAreaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([area]) => area);

  // Recent activity (last 5 items combined)
  const recentActivity = [
    ...quizHistory.map(q => ({ type: 'quiz' as const, date: q.date, label: `Quiz: ${SUBJECT_LABELS[q.subject] ?? q.subject} (${q.difficulty})`, score: Math.round((q.score / q.total) * 100) })),
    ...assessments.map(a => ({ type: 'assessment' as const, date: a.uploadedAt, label: `Assessment: ${a.filename}`, score: a.result?.percentage })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  if (!hasData) {
    return (
      <div className="rounded-2xl border bg-white p-10 text-center" role="region" aria-label="Progress overview">
        <div className="text-4xl mb-4">📊</div>
        <h2 className="text-lg font-semibold mb-2">No progress data yet</h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          Complete quizzes and upload assessments to see your mastery map, achievement streaks, and personalised insights here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" role="region" aria-label="Progress overview">

      {/* Mastery map */}
      <div className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Mastery Map</h2>
        <div className="space-y-4">
          {allSubjects.map(subjectId => {
            const stats = subjectStats[subjectId];
            const pct = stats && stats.totalQuestions > 0
              ? Math.round((stats.totalScore / stats.totalQuestions) * 100)
              : null;
            const mastery = pct !== null ? getMasteryLevel(pct) : null;
            const barColor = SUBJECT_COLORS[subjectId] ?? 'bg-slate-400';

            return (
              <div key={subjectId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">{SUBJECT_LABELS[subjectId]}</span>
                  <div className="flex items-center gap-2">
                    {mastery && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${mastery.color}`}>
                        {mastery.label}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {pct !== null ? `${pct}%` : 'No data'}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label={`${SUBJECT_LABELS[subjectId]} mastery`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${pct ?? 0}%` }}
                  />
                </div>
                {stats && (
                  <p className="text-xs text-slate-400 mt-0.5">{stats.attempts} quiz attempt{stats.attempts !== 1 ? 's' : ''}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Quizzes Completed', value: quizHistory.length, icon: '🧠' },
          { label: 'Assessments Uploaded', value: assessments.length, icon: '📄' },
          {
            label: 'Overall Quiz Average',
            value: quizHistory.length > 0
              ? `${Math.round((quizHistory.reduce((s, q) => s + q.score / q.total, 0) / quizHistory.length) * 100)}%`
              : '—',
            icon: '📈',
          },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl border bg-white p-4 text-center">
            <div className="text-2xl mb-1" aria-hidden="true">{stat.icon}</div>
            <div className="text-xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Weak areas */}
      {topWeakAreas.length > 0 && (
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-semibold mb-3">Focus Areas</h2>
          <p className="text-sm text-slate-500 mb-3">
            These topics appear most frequently as weak areas across your uploaded assessments.
          </p>
          <div className="flex flex-wrap gap-2">
            {topWeakAreas.map(area => (
              <span key={area} className="text-sm bg-red-50 text-red-700 border border-red-100 px-3 py-1 rounded-full">
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg" aria-hidden="true">{item.type === 'quiz' ? '🧠' : '📄'}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(item.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                {item.score !== undefined && (
                  <span className={`text-sm font-semibold ${item.score >= 70 ? 'text-green-600' : item.score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                    {item.score}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
