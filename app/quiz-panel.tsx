'use client';
import { useState } from 'react';

const SUBJECTS = [
  { id: 'psych-u1', name: 'VCE Psychology Unit 1' },
  { id: 'math10', name: 'General Mathematics' },
  { id: 'science10', name: 'Advanced Science' },
  { id: 'english10', name: 'English' },
  { id: 'ecobiz10', name: 'Entrepreneurship' },
];

const DIFFICULTIES = ['Foundation', 'Standard', 'Advanced'];

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  vcaaCode?: string;
}

interface QuizState {
  questions: QuizQuestion[];
  current: number;
  selected: string | null;
  score: number;
  finished: boolean;
  revealed: boolean;
}

export function QuizPanel() {
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState<QuizState | null>(null);

  async function startQuiz() {
    if (!subject || !difficulty) return;
    setLoading(true);
    setError('');
    setQuiz(null);
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, difficulty, count: 5 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      const data = await res.json();
      setQuiz({
        questions: data.questions,
        current: 0,
        selected: null,
        score: 0,
        finished: false,
        revealed: false,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(option: string) {
    if (!quiz || quiz.revealed) return;
    setQuiz({ ...quiz, selected: option, revealed: true });
  }

  function handleNext() {
    if (!quiz) return;
    const correct = quiz.selected === quiz.questions[quiz.current].answer;
    const newScore = quiz.score + (correct ? 1 : 0);
    const next = quiz.current + 1;
    if (next >= quiz.questions.length) {
      // Save to quiz history in localStorage
      try {
        const history = JSON.parse(localStorage.getItem('parris_quiz_history') || '[]');
        history.unshift({
          subject,
          difficulty,
          score: newScore,
          total: quiz.questions.length,
          date: new Date().toISOString(),
        });
        localStorage.setItem('parris_quiz_history', JSON.stringify(history.slice(0, 100)));
      } catch { /* ignore */ }
      setQuiz({ ...quiz, score: newScore, finished: true, revealed: true });
    } else {
      setQuiz({ ...quiz, current: next, selected: null, revealed: false, score: newScore });
    }
  }

  function resetQuiz() {
    setQuiz(null);
    setSubject('');
    setDifficulty('');
  }

  if (quiz?.finished) {
    const pct = Math.round((quiz.score / quiz.questions.length) * 100);
    return (
      <div className="rounded-2xl border bg-white p-8 max-w-2xl mx-auto text-center" role="region" aria-label="Quiz results">
        <div className="text-5xl mb-4">{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '📚'}</div>
        <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
        <p className="text-slate-600 mb-1">
          You scored <span className="font-semibold text-slate-900">{quiz.score}/{quiz.questions.length}</span> ({pct}%)
        </p>
        <p className="text-sm text-slate-500 mb-6">
          {pct >= 80 ? 'Excellent work! You have a strong grasp of this topic.' : pct >= 50 ? 'Good effort. Review the questions you missed and try again.' : 'Keep practising — use the Tutor to work through the concepts you found difficult.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={startQuiz} className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors" aria-label="Try again with same settings">
            Try Again
          </button>
          <button onClick={resetQuiz} className="px-5 py-2 rounded-lg border text-sm font-medium hover:bg-slate-50 transition-colors" aria-label="Start a new quiz">
            New Quiz
          </button>
        </div>
      </div>
    );
  }

  if (quiz) {
    const q = quiz.questions[quiz.current];
    const isCorrect = quiz.selected === q.answer;
    return (
      <div className="rounded-2xl border bg-white p-6 max-w-2xl mx-auto" role="region" aria-label="Quiz question">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
            Question {quiz.current + 1} of {quiz.questions.length}
          </span>
          <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-600">
            Score: {quiz.score}/{quiz.current}
          </span>
        </div>
        {q.vcaaCode && (
          <span className="inline-block text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full mb-3">
            {q.vcaaCode}
          </span>
        )}
        <p className="text-base font-medium text-slate-900 mb-5" role="heading" aria-level={3}>{q.question}</p>
        <div className="space-y-2" role="group" aria-label="Answer options">
          {q.options.map((opt, i) => {
            let cls = 'w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ';
            if (!quiz.revealed) {
              cls += 'hover:border-slate-400 hover:bg-slate-50 cursor-pointer';
            } else if (opt === q.answer) {
              cls += 'border-green-500 bg-green-50 text-green-800 font-medium';
            } else if (opt === quiz.selected) {
              cls += 'border-red-400 bg-red-50 text-red-700';
            } else {
              cls += 'opacity-50';
            }
            return (
              <button
                key={i}
                onClick={() => handleSelect(opt)}
                disabled={quiz.revealed}
                className={cls}
                aria-pressed={quiz.selected === opt}
                aria-label={`Option ${String.fromCharCode(65 + i)}: ${opt}`}
              >
                <span className="font-medium mr-2 text-slate-400">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            );
          })}
        </div>
        {quiz.revealed && (
          <div className={`mt-4 p-4 rounded-xl text-sm ${isCorrect ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`} role="alert">
            <p className="font-semibold mb-1">{isCorrect ? '✓ Correct!' : `✗ The correct answer is: ${q.answer}`}</p>
            <p>{q.explanation}</p>
          </div>
        )}
        {quiz.revealed && (
          <button
            onClick={handleNext}
            className="mt-4 w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
            aria-label={quiz.current + 1 < quiz.questions.length ? 'Next question' : 'See results'}
          >
            {quiz.current + 1 < quiz.questions.length ? 'Next Question →' : 'See Results'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-8 max-w-2xl mx-auto" role="region" aria-label="Quiz setup">
      <h2 className="text-lg font-semibold mb-1">Adaptive Quiz</h2>
      <p className="text-sm text-slate-500 mb-6">
        Select a subject and difficulty level. The AI will generate 5 curriculum-aligned questions for you.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="quiz-subject" className="block text-sm font-medium text-slate-700 mb-1">
            Subject
          </label>
          <select
            id="quiz-subject"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-label="Select subject"
          >
            <option value="">— Choose a subject —</option>
            {SUBJECTS.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="quiz-difficulty" className="block text-sm font-medium text-slate-700 mb-1">
            Difficulty
          </label>
          <div className="flex gap-2" role="group" aria-label="Select difficulty">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${difficulty === d ? 'bg-slate-900 text-white border-slate-900' : 'hover:bg-slate-50'}`}
                aria-pressed={difficulty === d}
                aria-label={`${d} difficulty`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <button
          onClick={startQuiz}
          disabled={!subject || !difficulty || loading}
          className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium disabled:opacity-40 hover:bg-slate-700 transition-colors"
          aria-label="Generate and start quiz"
          aria-busy={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Generating questions…
            </span>
          ) : 'Start Quiz'}
        </button>
      </div>
    </div>
  );
}
