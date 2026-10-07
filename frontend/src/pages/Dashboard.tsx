import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api/client';
import type { Quiz } from '@/types';
import { EmptyState, StatusBadge, fmtDate } from '@/components/shared';
import { Button } from '@/components/ui';

// Dashboard — Qwizo's home. Greeting, overlapping quick-action cards on a
// brand band, search, "browse for subject / grade" selectors, stats, recents.

function daypart() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}

const GRADES = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);

const ACTIONS = [
  {
    to: '/app/quizzes/new',
    title: 'Create',
    sub: 'a quiz',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  },
  {
    to: '/app/quizzes/new/ai',
    title: 'Generate',
    sub: 'with AI',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" />
        <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9Z" />
      </svg>
    ),
  },
  {
    to: '/app/templates',
    title: 'Browse',
    sub: 'templates',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
];

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');

  const load = () => {
    setLoading(true);
    setLoadError(false);
    Promise.all([api.stats(), api.listQuizzes()])
      .then(([s, q]) => { setStats(s.stats); setQuizzes(q.quizzes); })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const firstName = user?.name.split(' ')[0] || 'there';

  // Subjects: prefer onboarding picks, fall back to subjects on quizzes.
  const subjects = useMemo(() => {
    const fromProfile = (user?.subjects || []).filter(Boolean);
    if (fromProfile.length) return fromProfile;
    const seen: string[] = [];
    for (const q of quizzes) {
      const s = (q.subject || '').trim();
      if (s && !seen.includes(s)) seen.push(s);
    }
    return seen.slice(0, 12);
  }, [user, quizzes]);

  // Grades: prefer onboarding picks, fall back to grades on quizzes.
  const grades = useMemo(() => {
    const fromProfile = (user?.grades || []).filter(Boolean);
    if (fromProfile.length) return fromProfile;
    const seen: string[] = [];
    for (const q of quizzes) {
      const g = (q.grade || '').trim();
      if (g && !seen.includes(g)) seen.push(g);
    }
    return seen.length ? seen : GRADES;
  }, [user, quizzes]);

  const filtered = useMemo(() => {
    return quizzes.filter(q => {
      if (subject && (q.subject || '').toLowerCase() !== subject.toLowerCase()) return false;
      if (grade && (q.grade || '') !== grade) return false;
      return true;
    }).slice(0, 8);
  }, [quizzes, subject, grade]);

  const cards = stats ? [
    { label: 'Total quizzes', value: stats.quizzes || 0 },
    { label: 'Published', value: stats.published || 0 },
    { label: 'Student submissions', value: stats.submissions || 0 },
    { label: 'Bank questions', value: stats.bank || 0 },
  ] : [];

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/app/quizzes${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`);
  };

  return (
    <div>
      {/* greeting */}
      <h1 className="text-center text-[24px] md:text-[28px] font-bold text-ink tracking-tight">
        Good {daypart()}, {firstName}
      </h1>
      <p className="text-center text-ink/60 text-[15px] mt-1 mb-6">Let's get started.</p>

      {/* brand band with overlapping action cards */}
      <div className="relative mb-10">
        <div className="h-28 rounded-3xl bg-gradient-to-r from-sky via-lime/50 to-sky" aria-hidden="true" />
        <div className="absolute inset-x-0 -bottom-8 flex justify-center">
          <div className="grid grid-cols-3 gap-3 md:gap-5 w-full max-w-2xl px-4">
            {ACTIONS.map(a => (
              <Link
                key={a.to}
                to={a.to}
                className="group relative bg-white rounded-2xl border border-line shadow-soft
                  px-4 pt-8 pb-5 flex flex-col items-center text-center
                  transition-all duration-180 hover:border-lime hover:-translate-y-1 hover:shadow-lift
                  focus-visible:outline-2 focus-visible:outline-lime"
              >
                <span className="absolute -top-6 w-12 h-12 rounded-full bg-white border border-line shadow-soft
                  flex items-center justify-center text-ink group-hover:bg-lime group-hover:border-lime transition-colors">
                  {a.icon}
                </span>
                <span className="block font-bold text-ink text-[16px]">{a.title}</span>
                <span className="block text-ink/50 text-[13px]">{a.sub}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* search */}
      <form onSubmit={submitSearch} className="flex gap-2 max-w-2xl mx-auto mb-10 mt-14">
        <div className="relative flex-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search for any topic"
            className="w-full rounded-full border border-line bg-white pl-12 pr-4 py-3 text-[15px]
              placeholder:text-ink/35 focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/30 transition"
          />
        </div>
        <button
          type="submit"
          aria-label="Search"
          className="w-12 h-12 shrink-0 rounded-2xl bg-lime text-ink flex items-center justify-center
            hover:brightness-95 active:scale-95 transition focus-visible:outline-2 focus-visible:outline-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            className="w-5 h-5">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
        </button>
      </form>

      {loading ? (
        <div className="text-sm text-ink/40 py-8 text-center">Loading…</div>
      ) : loadError ? (
        <EmptyState
          title="Could not load your dashboard"
          body="Check your connection and try again."
          action={<Button size="sm" onClick={load}>Retry</Button>}
        />
      ) : (
        <div className="max-w-5xl mx-auto">
          {/* browse selectors */}
          <div className="flex items-center gap-4 mb-8">
            <span className="flex-1 h-px bg-line" aria-hidden="true" />
            <span className="text-ink/60 text-[15px] font-medium whitespace-nowrap">Browse quizzes for</span>
            <label className="relative">
              <span className="sr-only">Subject</span>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="appearance-none bg-transparent font-bold text-ink text-[17px] pr-6 py-1
                  border-b-2 border-lime cursor-pointer focus:outline-none"
              >
                <option value="">Subject</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                className="w-4 h-4 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-ink/60">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </label>
            <label className="relative">
              <span className="sr-only">Grade</span>
              <select
                value={grade}
                onChange={e => setGrade(e.target.value)}
                className="appearance-none bg-transparent font-bold text-ink text-[17px] pr-6 py-1
                  border-b-2 border-lime cursor-pointer focus:outline-none"
              >
                <option value="">Grade</option>
                {grades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                className="w-4 h-4 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-ink/60">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </label>
            <span className="flex-1 h-px bg-line" aria-hidden="true" />
          </div>

          {/* stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {cards.map(c => (
              <div key={c.label} className="bg-paper border border-line rounded-card p-5">
                <div className="text-2xl font-bold">{c.value}</div>
                <div className="text-[13px] text-ink/55 mt-1">{c.label}</div>
              </div>
            ))}
          </div>

          {/* quizzes */}
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-base font-bold">
              {subject || grade
                ? `Quizzes${subject ? ` · ${subject}` : ''}${grade ? ` · ${grade}` : ''}`
                : 'Recent quizzes'}
            </h3>
            {(subject || grade) && (
              <button
                onClick={() => { setSubject(''); setGrade(''); }}
                className="text-[13px] font-medium text-ink/55 hover:text-ink"
              >
                Clear filters
              </button>
            )}
          </div>
          {filtered.length ? (
            <div className="bg-paper border border-line rounded-card divide-y divide-line/60">
              {filtered.map(q => (
                <div key={q.id} className="row-interactive flex items-center gap-4 px-5 py-4 rounded-card">
                  <div className="flex-1 min-w-0">
                    <Link to={`/app/quizzes/${q.id}`} className="interact font-medium text-[15px] truncate block hover:underline hover:decoration-ink/30 hover:underline-offset-4">
                      {q.title}
                    </Link>
                    <div className="text-xs text-ink/40 mt-0.5">
                      {(q as Quiz & { question_count?: number }).question_count ?? 0} questions ·{' '}
                      {(q as Quiz & { submission_count?: number }).submission_count ?? 0} submissions ·{' '}
                      {q.grade ? `${q.grade} · ` : ''}updated {fmtDate(q.updated_at)}
                    </div>
                  </div>
                  <StatusBadge status={q.status} />
                  <Link to={`/app/quizzes/${q.id}`}>
                    <Button variant="secondary" size="sm">Open</Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-paper border border-line rounded-card p-12 text-center">
              <h3 className="font-bold mb-1">No quizzes found</h3>
              <p className="text-sm text-ink/55 mb-4">
                {subject || grade
                  ? 'Try a different subject or grade.'
                  : 'Create your first quiz — with AI or by hand.'}
              </p>
              <Link to="/app/quizzes/new"><Button>Create quiz</Button></Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
