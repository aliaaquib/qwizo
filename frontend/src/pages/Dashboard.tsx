import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api/client';
import type { QuizTemplate } from '@/types';
import { EmptyState } from '@/components/shared';
import { Button } from '@/components/ui';

// Dashboard — greeting, quick actions, template search,
// "browse templates for subject / grade", templates by subject.

function daypart() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}

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

interface SubjectGroup {
  subject: string;
  templates: QuizTemplate[];
}

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<SubjectGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    const params: Record<string, string> = { limit: '60' };
    if (subject) params.subject = subject;
    if (grade) params.grade = grade;
    Promise.all([
      api.listTemplates(params),
      api.listTemplateSubjects(),
    ])
      .then(([t, s]) => {
        const bySubject = new Map<string, QuizTemplate[]>();
        for (const tmpl of t.templates) {
          const key = tmpl.subject || 'General';
          if (!bySubject.has(key)) bySubject.set(key, []);
          bySubject.get(key)!.push(tmpl);
        }
        setGroups([...bySubject.entries()].map(([subject, templates]) => ({ subject, templates })));
        setSubjects(s.subjects.map(x => x.subject));
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, [subject, grade]);

  const firstName = user?.name.split(' ')[0] || 'there';

  const grades = useMemo(() => {
    const fromProfile = (user?.grades || []).filter(Boolean);
    if (fromProfile.length) return fromProfile;
    return Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);
  }, [user]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/app/templates${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`);
  };

  return (
    <div>
      {/* greeting */}
      <h1 className="text-center text-[20px] md:text-[22px] font-bold text-ink tracking-tight">
        Good {daypart()}, {firstName}
      </h1>
      <p className="text-center text-ink/60 text-[13px] mt-1 mb-6">Let's get started.</p>

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
                <span className="block font-bold text-ink text-[14px]">{a.title}</span>
                <span className="block text-ink/50 text-[12px]">{a.sub}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* search templates */}
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
            className="w-full rounded-full border border-line bg-white pl-12 pr-4 py-3 text-[14px]
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
          title="Could not load templates"
          body="Check your connection and try again."
          action={<Button size="sm" onClick={load}>Retry</Button>}
        />
      ) : (
        <div className="max-w-5xl mx-auto">
          {/* browse selectors */}
          <div className="flex items-center gap-4 mb-8">
            <span className="flex-1 h-px bg-line" aria-hidden="true" />
            <span className="text-ink/60 text-[13px] font-medium whitespace-nowrap">Browse templates for</span>
            <label className="relative">
              <span className="sr-only">Subject</span>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="appearance-none bg-transparent font-bold text-ink text-[15px] pr-6 py-1
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
                className="appearance-none bg-transparent font-bold text-ink text-[15px] pr-6 py-1
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

          {/* templates by subject */}
          <div className="flex items-baseline gap-3 mb-4">
            <h3 className="text-[14px] font-bold">Templates</h3>
            <Link
              to="/app/templates"
              className="text-[13px] font-semibold underline underline-offset-4 decoration-ink/30
                hover:decoration-ink flex items-center gap-1"
            >
              See all <span aria-hidden="true">→</span>
            </Link>
            {(subject || grade) && (
              <button
                onClick={() => { setSubject(''); setGrade(''); }}
                className="ml-auto text-[13px] font-medium text-ink/55 hover:text-ink"
              >
                Clear filters
              </button>
            )}
          </div>

          {groups.length ? (
            <div className="flex flex-col gap-5">
              {groups.map(g => (
                <div
                  key={g.subject}
                  className="relative bg-white border border-line rounded-2xl p-6 md:p-8 overflow-hidden"
                >
                  {/* folded corner */}
                  <span
                    aria-hidden="true"
                    className="absolute top-0 right-0 w-10 h-10 bg-neutral border-l border-b border-line
                      rounded-bl-xl"
                    style={{ clipPath: 'polygon(0 0, 100% 100%, 0 100%)' }}
                  />
                  <div className="flex gap-8">
                    <div className="w-48 shrink-0">
                      <h4 className="text-[17px] font-bold text-ink leading-tight">{g.subject}</h4>
                      <p className="text-[12px] text-ink/50 mt-1">
                        {g.templates.length} template{g.templates.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      {g.templates.slice(0, 3).map((t, i) => (
                        <Link
                          key={t.id}
                          to="/app/templates"
                          className="flex items-baseline gap-4 py-2.5 group/tmpl"
                        >
                          <span className="text-[13px] text-ink/50 w-20 shrink-0">Template {i + 1}</span>
                          <span className="text-[14px] font-medium text-ink truncate
                            group-hover/tmpl:underline group-hover/tmpl:decoration-lime group-hover/tmpl:underline-offset-4">
                            {t.title}
                          </span>
                          <span className="ml-auto text-[12px] text-ink/40 shrink-0">
                            {t.question_count} questions
                          </span>
                        </Link>
                      ))}
                      {g.templates.length > 3 && (
                        <Link
                          to={`/app/templates?subject=${encodeURIComponent(g.subject)}`}
                          className="inline-flex items-center gap-2 mt-2 text-[13px] font-bold text-ink
                            hover:underline hover:decoration-lime hover:underline-offset-4"
                        >
                          See all <span aria-hidden="true">→</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-paper border border-line rounded-card p-12 text-center">
              <h3 className="font-bold mb-1">No templates yet</h3>
              <p className="text-sm text-ink/55 mb-4">
                {subject || grade
                  ? 'Try a different subject or grade.'
                  : 'When teachers publish quizzes, they appear here for everyone.'}
              </p>
              <Link to="/app/quizzes/new"><Button>Create quiz</Button></Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
