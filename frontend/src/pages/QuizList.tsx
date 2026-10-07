import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import type { Quiz } from '@/types';
import { EmptyState, useConfirm, useToast } from '@/components/shared';
import { StatusBadge } from '@/components/shared';
import { Button, IconButton, Input } from '@/components/ui';

type QuizRow = Quiz & { question_count?: number; submission_count?: number };

// My library — Wayground-style: sub-sidebar filters, "Created by me",
// status tabs, and an AI-powered empty state.

const FILTERS = [
  { id: '', label: 'All quizzes' },
  { id: 'draft', label: 'Drafts' },
  { id: 'published', label: 'Published' },
  { id: 'archived', label: 'Archived' },
];

const CREATE_OPTIONS = [
  {
    to: '/app/quizzes/new',
    title: 'Blank quiz',
    body: 'Start from scratch and add questions by hand',
  },
  {
    to: '/app/quizzes/new/ai',
    title: 'Generate with AI',
    body: 'Describe your quiz and let AI draft the questions',
  },
  {
    to: '/app/quizzes/new/ai-upload',
    title: 'Generate from upload',
    body: 'Upload notes or slides and build from your material',
  },
];

export function QuizList() {
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState('');
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
      const rows = d.quizzes as QuizRow[];
      setQuizzes(rows);
      const c: Record<string, number> = { '': rows.length, draft: 0, published: 0, archived: 0 };
      for (const r of rows) c[r.status] = (c[r.status] || 0) + 1;
      setCounts(c);
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

  const filtered = status ? quizzes.filter(x => x.status === status) : quizzes;

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

  return (
    <div className="flex min-h-[calc(100vh-0px)]">
      {/* sub-sidebar — flush against the main sidebar */}
      <aside className="w-60 shrink-0 hidden md:block bg-paper border-r border-line px-6 py-8">
        <h2 className="text-[18px] font-bold text-ink mb-4">Library</h2>
        <nav className="space-y-1">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setStatus(f.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-control text-[14px] font-medium
                transition-colors focus-visible:outline-2 focus-visible:outline-lime ${
                status === f.id
                  ? 'bg-lime/50 text-ink'
                  : 'text-ink/60 hover:text-ink hover:bg-neutral'
              }`}
            >
              {f.label}
              <span className="text-[13px] text-ink/40">{counts[f.id] ?? 0}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* main */}
      <div className="flex-1 min-w-0 px-8 py-10">
        {/* search */}
        <div className="relative mb-6">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <Input
            placeholder="Search by quiz name"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="pl-12"
          />
        </div>

        <div className="flex items-center justify-between mb-5">
          <h1 className="text-[22px] font-bold text-ink tracking-tight">Created by me</h1>
          <div className="relative">
            <Button size="sm" onClick={() => setMenuOpen(o => !o)} aria-haspopup="menu" aria-expanded={menuOpen}>
              + New quiz
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                className={`w-4 h-4 ml-1 transition-transform ${menuOpen ? 'rotate-180' : ''}`}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </Button>
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

        {/* status tabs */}
        <div className="flex gap-6 mb-6 border-b border-line md:hidden">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setStatus(f.id)}
              className={`pb-2.5 text-[14px] font-medium transition-colors -mb-px
                ${status === f.id
                  ? 'text-ink border-b-2 border-lime'
                  : 'text-ink/50 hover:text-ink border-b-2 border-transparent'}`}
            >
              {f.label} ({counts[f.id] ?? 0})
            </button>
          ))}
        </div>
        <div className="hidden md:flex gap-2 mb-6">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setStatus(f.id)}
              className={`px-4 py-2 rounded-full text-[14px] font-medium border transition-all
                focus-visible:outline-2 focus-visible:outline-lime ${
                status === f.id
                  ? 'bg-ink border-ink text-white'
                  : 'bg-white border-line text-ink/60 hover:border-lime hover:text-ink'
              }`}
            >
              {f.label} ({counts[f.id] ?? 0})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-sm text-ink/40 py-8 text-center">Loading…</div>
        ) : filtered.length ? (
          <div className="bg-paper border border-line rounded-card divide-y divide-line/60">
            {filtered.map(quiz => (
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
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            {q || status ? (
              <EmptyState
                title="No quizzes match"
                body="Try a different search or filter."
              />
            ) : (
              <>
                <h2 className="text-[20px] font-bold text-ink mb-6">Let's create your first quiz!</h2>
                <div className="max-w-md mx-auto mb-8">
                  <Input placeholder="Search for a quiz" value={q} onChange={e => setQ(e.target.value)} />
                </div>
                <p className="text-[15px] text-ink/60 mb-4">
                  Or create one using <span className="font-extrabold text-ink tracking-tight">QWIZO AI</span>
                </p>
                <div className="grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
                  {CREATE_OPTIONS.map(o => (
                    <Link
                      key={o.to}
                      to={o.to}
                      className="group bg-white border border-line rounded-2xl p-4
                        transition-all duration-180 hover:border-lime hover:shadow-soft hover:-translate-y-0.5
                        focus-visible:outline-2 focus-visible:outline-lime"
                    >
                      <span className="block text-[13px] text-ink/50">{o.title === 'Blank quiz' ? 'Or' : o.title.startsWith('Generate') ? 'Generate from' : 'Start from'}</span>
                      <span className="block text-[15px] font-bold text-ink mt-0.5">
                        {o.title === 'Blank quiz' ? 'Create from scratch' : o.title.replace('Generate with AI', 'Prompt').replace('Generate from upload', 'Document')}
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {dialog}
        {toastEl}
      </div>
    </div>
  );
}
