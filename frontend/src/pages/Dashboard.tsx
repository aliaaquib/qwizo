import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api/client';
import type { Quiz } from '@/types';
import { EmptyState, StatusBadge, fmtDate } from '@/components/shared';
import { Button } from '@/components/ui';

// Dashboard — Qwizo's home: greeting, quick actions, search,
// stats, and subject browsing personalized from onboarding.

function daypart() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}

const ACTIONS = [
  {
    to: '/app/quizzes/new',
    title: 'Create',
    sub: 'a blank quiz',
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
  const [recent, setRecent] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    api.stats()
      .then(d => { setStats(d.stats); setRecent(d.recent); })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const firstName = user?.name.split(' ')[0] || 'there';

  // Subjects: prefer onboarding picks, fall back to subjects on their quizzes.
  const subjects = useMemo(() => {
    const fromProfile = (user?.subjects || []).filter(Boolean);
    if (fromProfile.length) return fromProfile;
    const seen: string[] = [];
    for (const q of recent) {
      const s = (q.subject || '').trim();
      if (s && !seen.includes(s)) seen.push(s);
    }
    return seen.slice(0, 8);
  }, [user, recent]);

  const filtered = useMemo(() => {
    if (!subject) return recent;
    return recent.filter(q => (q.subject || '').toLowerCase() === subject.toLowerCase());
  }, [recent, subject]);

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
    <div className="max-w-5xl mx-auto">
      {/* greeting hero */}
      <div className="rounded-3xl bg-gradient-to-br from-sky via-sky/60 to-lime/40 border border-line px-8 py-8 mb-6">
        <h1 className="text-[26px] md:text-[30px] font-bold text-ink tracking-tight">
          Good {daypart()}, {firstName}
        </h1>
        <p className="text-ink/60 text-[15px] mt-1">Let's get started.</p>

        {/* quick actions */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mt-6 max-w-2xl">
          {ACTIONS.map(a => (
            <Link
              key={a.to}
              to={a.to}
              className="group bg-white/90 backdrop-blur rounded-2xl border border-line px-4 py-5
                flex flex-col items-center text-center gap-2
                transition-all duration-180 hover:border-lime hover:shadow-soft hover:-translate-y-0.5
                focus-visible:outline-2 focus-visible:outline-lime"
            >
              <span className="w-11 h-11 rounded-full bg-lime/25 flex items-center justify-center text-ink
                group-hover:bg-lime transition-colors">
                {a.icon}
              </span>
              <span>
                <span className="block font-bold text-ink text-[15px]">{a.title}</span>
                <span className="block text-ink/50 text-[13px]">{a.sub}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* search */}
      <form onSubmit={submitSearch} className="relative mb-8">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search your quizzes…"
          className="w-full rounded-full border border-line bg-white pl-12 pr-4 py-3.5 text-[15px]
            placeholder:text-ink/35 focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/30 transition"
        />
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
        <>
          {/* stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {cards.map(c => (
              <div key={c.label} className="bg-paper border border-line rounded-card p-5">
                <div className="text-2xl font-bold">{c.value}</div>
                <div className="text-[13px] text-ink/55 mt-1">{c.label}</div>
              </div>
            ))}
          </div>

          {/* browse by subject */}
          {subjects.length > 0 && (
            <div className="mb-8">
              <h3 className="text-base font-bold mb-3">Browse by subject</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSubject(null)}
                  className={`rounded-full px-4 py-2 text-[14px] font-medium border transition-all
                    focus-visible:outline-2 focus-visible:outline-lime ${
                    subject === null
                      ? 'bg-ink border-ink text-white'
                      : 'bg-white border-line text-ink/70 hover:border-lime'
                  }`}
                >
                  All
                </button>
                {subjects.map(s => (
                  <button
                    key={s}
                    onClick={() => setSubject(subject === s ? null : s)}
                    className={`rounded-full px-4 py-2 text-[14px] font-medium border transition-all
                      focus-visible:outline-2 focus-visible:outline-lime ${
                      subject === s
                        ? 'bg-lime border-lime text-ink'
                        : 'bg-white border-line text-ink/70 hover:border-lime'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* recent quizzes */}
          <h3 className="text-base font-bold mb-3">
            {subject ? `${subject} quizzes` : 'Recent quizzes'}
          </h3>
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
                      updated {fmtDate(q.updated_at)}
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
              <h3 className="font-bold mb-1">
                {subject ? `No ${subject} quizzes yet` : 'No quizzes yet'}
              </h3>
              <p className="text-sm text-ink/55 mb-4">Create your first quiz — with AI or by hand.</p>
              <Link to="/app/quizzes/new"><Button>Create quiz</Button></Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
