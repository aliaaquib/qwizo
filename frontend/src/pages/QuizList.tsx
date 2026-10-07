import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import type { Quiz } from '@/types';
import { EmptyState, useConfirm, useToast } from '@/components/shared';
import { StatusBadge } from '@/components/shared';
import { IconButton } from '@/components/ui';
import { QwizoLogo } from '@/components/QwizoLogo';

type QuizRow = Quiz & { question_count?: number; submission_count?: number };
type Section = 'created' | 'used' | 'shared' | 'all';

// My library — sub-sidebar sections, "Created by me" tabs, AI empty state.

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  {
    id: 'created', label: 'Created',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    ),
  },
  {
    id: 'used', label: 'Previously used',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    id: 'shared', label: 'Shared with me',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
        <path d="M12 3v13" /><path d="M7 8l5-5 5 5" />
      </svg>
    ),
  },
  {
    id: 'all', label: 'All activities',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
        <path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" />
        <path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" />
      </svg>
    ),
  },
];

const TABS = [
  { id: '', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'archived', label: 'Archived' },
];

const AI_CARDS = [
  {
    to: '/app/quizzes/new/ai-upload',
    eyebrow: 'Generate from',
    title: 'Document',
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" /><path d="M9 13h6" /><path d="M9 17h6" />
      </svg>
    ),
  },
  {
    to: '/app/quizzes/new/ai',
    eyebrow: 'Generate from',
    title: 'Prompt',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" />
        <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9Z" />
      </svg>
    ),
  },
  {
    to: '/app/quizzes/new',
    eyebrow: 'Or',
    title: 'Create from scratch',
    iconBg: 'bg-neutral',
    iconColor: 'text-ink/60',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-6 h-6">
        <path d="M12 5v14" /><path d="M5 12h14" />
      </svg>
    ),
  },
];

const CREATE_OPTIONS = [
  { to: '/app/quizzes/new', title: 'Blank quiz', body: 'Start from scratch and add questions by hand' },
  { to: '/app/quizzes/new/ai', title: 'Generate with AI', body: 'Describe your quiz and let AI draft the questions' },
  { to: '/app/quizzes/new/ai-upload', title: 'Generate from upload', body: 'Upload notes or slides and build from your material' },
];

export function QuizList() {
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [section, setSection] = useState<Section>('created');
  const [tab, setTab] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const { confirm, dialog } = useConfirm();
  const { show, el: toastEl } = useToast();
  const navigate = useNavigate();

  const draw = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (q.trim()) params.q = q.trim();
      const d = await api.listQuizzes(params);
      setQuizzes(d.quizzes as QuizRow[]);
    } catch (e) {
      show(e instanceof Error ? e.message : 'Failed to load quizzes.', true);
    } finally {
      setLoading(false);
    }
  }, [q, show]);

  useEffect(() => {
    const t = setTimeout(draw, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [draw, q]);

  const visible = quizzes.filter(x => {
    if (section === 'used' && !(x.submission_count! > 0)) return false;
    if (section === 'shared') return false;
    if (section === 'created' && tab && x.status !== tab) return false;
    return true;
  });

  const tabCounts: Record<string, number> = { '': quizzes.length, draft: 0, archived: 0 };
  for (const r of quizzes) if (r.status in tabCounts) tabCounts[r.status] += 1;

  const duplicate = async (id: string) => {
    try {
      const d = await api.duplicateQuiz(id);
      show('Duplicated as draft.');
      navigate(`/app/quizzes/${d.quiz.id}`);
    } catch (e) {
      show(e instanceof Error ? e.message : 'Duplicate failed.', true);
    }
  };

  const del = async (id: string) => {
    const ok = await confirm(
      'Delete quiz?',
      'This quiz, its questions and all student submissions will be permanently deleted.',
      'Delete',
    );
    if (!ok) return;
    try {
      await api.deleteQuiz(id);
      show('Quiz deleted.');
      draw();
    } catch (e) {
      show(e instanceof Error ? e.message : 'Delete failed.', true);
    }
  };

  const sectionTitle =
    section === 'created' ? 'Created by me'
    : section === 'used' ? 'Previously used'
    : section === 'shared' ? 'Shared with me'
    : 'All activities';

  const renderRow = (quiz: QuizRow) => (
    <div key={quiz.id} className="row-interactive flex items-center gap-4 px-5 py-4 rounded-card">
      <div className="flex-1 min-w-0">
        <Link
          to={`/app/quizzes/${quiz.id}`}
          className="interact font-medium text-[15px] truncate block hover:underline hover:decoration-ink/30 hover:underline-offset-4"
        >
          {quiz.title}
        </Link>
        <div className="text-xs text-ink/40 mt-0.5">
          {quiz.subject || 'No subject'}
          {quiz.topic ? ` · ${quiz.topic}` : ''} ·{' '}
          {quiz.question_count ?? 0} questions ·{' '}
          {quiz.submission_count ?? 0} submissions
        </div>
      </div>
      <StatusBadge status={quiz.status} />
      <div className="flex items-center gap-1">
        {quiz.status === 'published' && (
          <>
            <Link to={`/app/quizzes/${quiz.id}/share`} aria-label="Share quiz" className="has-tooltip">
              <span className="icon-btn" aria-hidden="true">↗</span>
              <span className="tooltip-bubble" role="tooltip">Share quiz</span>
            </Link>
            <Link to={`/app/quizzes/${quiz.id}/results`} aria-label="View results" className="has-tooltip">
              <span className="icon-btn" aria-hidden="true">◔</span>
              <span className="tooltip-bubble" role="tooltip">View results</span>
            </Link>
          </>
        )}
        <IconButton label="Duplicate quiz" onClick={() => duplicate(quiz.id)}>⧉</IconButton>
        <IconButton label="Delete quiz" danger onClick={() => del(quiz.id)}>×</IconButton>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-0px)]">
      {/* sub-sidebar */}
      <aside className="w-60 shrink-0 hidden md:block bg-paper border-r border-line px-6 py-8">
        <h2 className="text-[18px] font-bold text-ink mb-4">Library</h2>
        <nav className="space-y-1">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => { setSection(s.id); setTab(''); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-control text-[15px] font-medium
                transition-colors focus-visible:outline-2 focus-visible:outline-lime ${
                section === s.id
                  ? 'bg-lime/50 text-ink'
                  : 'text-ink/60 hover:text-ink hover:bg-neutral'
              }`}
            >
              <span className="shrink-0">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* main */}
      <div className="flex-1 min-w-0 px-8 py-8">
        {/* top search */}
        <div className="relative mb-8 max-w-3xl">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            placeholder="Search by quiz name"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="w-full rounded-full border border-line bg-white pl-13 pr-5 py-3.5 text-[15px]
              placeholder:text-ink/35 focus:outline-2 focus:outline-lime"
            style={{ paddingLeft: '3.25rem' }}
          />
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[24px] font-bold text-ink tracking-tight">{sectionTitle}</h1>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="interact inline-flex items-center gap-1.5 rounded-full bg-lime px-5 py-2.5
                text-[15px] font-bold text-ink shadow-soft hover:brightness-[0.97] active:scale-[0.98]
                focus-visible:outline-2 focus-visible:outline-ink transition-all"
            >
              + New quiz
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <span className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                <div role="menu" className="absolute right-0 top-full mt-2 w-72 z-20 bg-white border border-line
                  rounded-2xl shadow-lift py-2 overflow-hidden">
                  {CREATE_OPTIONS.map(o => (
                    <Link
                      key={o.to}
                      to={o.to}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="block px-5 py-3 hover:bg-neutral transition-colors"
                    >
                      <span className="block text-[15px] font-semibold text-ink">{o.title}</span>
                      <span className="block text-[13px] text-ink/55 mt-0.5">{o.body}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* tabs — pill only on the selected one */}
        {section === 'created' && (
          <div className="flex items-center gap-7 mb-8">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`text-[15px] transition-all focus-visible:outline-2 focus-visible:outline-lime rounded-full ${
                  tab === t.id
                    ? 'font-bold text-ink bg-white border border-line shadow-soft px-5 py-2'
                    : 'font-medium text-ink/55 hover:text-ink px-1 py-2'
                }`}
              >
                {t.label} ({tabCounts[t.id] ?? 0})
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-ink/40 py-8 text-center">Loading…</div>
        ) : visible.length ? (
          <div className="bg-paper border border-line rounded-card divide-y divide-line/60">
            {visible.map(renderRow)}
          </div>
        ) : section === 'shared' ? (
          <EmptyState
            title="Nothing shared with you yet"
            body="When another teacher shares a quiz with you, it will appear here."
          />
        ) : q || tab || section !== 'created' ? (
          <EmptyState
            title="No quizzes match"
            body="Try a different search or filter."
          />
        ) : (
          <div className="text-center pt-6">
            <h2 className="text-[22px] font-bold text-ink mb-8">Let's create your first quiz!</h2>
            <div className="relative mb-10 max-w-2xl mx-auto">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-ink pointer-events-none">
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                placeholder="Search for a quiz"
                value={q}
                onChange={e => setQ(e.target.value)}
                className="w-full rounded-full border border-line bg-white py-3.5 text-[15px]
                  placeholder:text-ink/35 focus:outline-2 focus:outline-lime"
                style={{ paddingLeft: '3.25rem', paddingRight: '1.25rem' }}
              />
            </div>
            <p className="text-[16px] text-ink/70 mb-6 flex items-center justify-center gap-2.5">
              Or create one using
              <QwizoLogo variant="full" markSize={24} />
              <span className="font-extrabold tracking-tight text-[20px] text-lime">AI</span>
            </p>
            <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
              {AI_CARDS.map(c => (
                <Link
                  key={c.to}
                  to={c.to}
                  className="group flex items-center gap-4 bg-white border border-line rounded-xl p-4
                    transition-all duration-180 hover:border-lime hover:shadow-soft hover:-translate-y-0.5
                    focus-visible:outline-2 focus-visible:outline-lime"
                >
                  <span className={`w-12 h-12 rounded-lg ${c.iconBg} ${c.iconColor} flex items-center justify-center shrink-0`}>
                    {c.icon}
                  </span>
                  <span>
                    <span className="block text-[13px] text-ink/50">{c.eyebrow}</span>
                    <span className="block text-[16px] font-bold text-ink">{c.title}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
        {dialog}
        {toastEl}
      </div>
    </div>
  );
}
