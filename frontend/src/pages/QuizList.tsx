import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import type { Quiz } from '@/types';
import { PageHead, EmptyState, useConfirm, useToast } from '@/components/shared';
import { StatusBadge } from '@/pages/Dashboard';
import { Button, IconButton, Input } from '@/components/ui';

type QuizRow = Quiz & { question_count?: number; submission_count?: number };

export function QuizList() {
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const { confirm, dialog } = useConfirm();
  const { show, el: toastEl } = useToast();
  const navigate = useNavigate();

  const draw = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      if (q.trim()) params.q = q.trim();
      const d = await api.listQuizzes(params);
      setQuizzes(d.quizzes as QuizRow[]);
    } catch (e) {
      show(e instanceof Error ? e.message : 'Failed to load quizzes.', true);
    } finally {
      setLoading(false);
    }
  }, [status, q, show]);

  useEffect(() => {
    const t = setTimeout(draw, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [draw, q]);

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
    <div>
      <PageHead
        title="Quizzes"
        subtitle="Draft, publish and share your quizzes."
        action={<Link to="/app/quizzes/new"><Button size="sm">+ New quiz</Button></Link>}
      />
      <div className="flex gap-2.5 mb-5 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search quizzes…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <select
          className="input-qwizo px-3 py-2.5 text-sm border border-line rounded-control bg-paper"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-ink/40 py-8 text-center">Loading…</div>
      ) : quizzes.length ? (
        <div className="bg-paper border border-line rounded-card divide-y divide-line/60">
          {quizzes.map(quiz => (
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
        <EmptyState
          title={q || status ? 'No quizzes match' : 'No quizzes yet'}
          body={q || status ? 'Try a different search or filter.' : 'Create your first quiz — with AI or by hand.'}
          action={!q && !status ? <Link to="/app/quizzes/new"><Button>Create quiz</Button></Link> : undefined}
        />
      )}
      {dialog}
      {toastEl}
    </div>
  );
}
