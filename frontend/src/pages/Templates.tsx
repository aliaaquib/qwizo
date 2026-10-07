import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api/client';
import type { QuizTemplate } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';
import { Button, Input } from '@/components/ui';
import { PageHead, EmptyState, useConfirm, useToast } from '@/components/shared';

// Templates — shared gallery of published quizzes. Publishing a quiz
// automatically saves it here; other teachers can preview and clone it
// into their own quizzes as a draft.

export function Templates() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();
  const { show, el: toastEl } = useToast();
  const [templates, setTemplates] = useState<QuizTemplate[]>([]);
  const [subjects, setSubjects] = useState<{ subject: string; c: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');
  const [searchParams] = useSearchParams();

  // Allow deep-linking with ?subject= or ?q= (e.g. from the dashboard).
  useEffect(() => {
    const s = searchParams.get('subject');
    const qq = searchParams.get('q');
    if (s) setSubject(s);
    if (qq) setQ(qq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [using, setUsing] = useState<string | null>(null);

  const draw = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (q.trim()) params.q = q.trim();
      if (subject) params.subject = subject;
      const d = await api.listTemplates(params);
      setTemplates(d.templates);
      setTotal(d.total);
      const s = await api.listTemplateSubjects();
      setSubjects(s.subjects);
    } catch (e) {
      show(e instanceof Error ? e.message : 'Failed to load templates.', true);
    } finally {
      setLoading(false);
    }
  }, [q, subject, show]);

  useEffect(() => {
    const t = setTimeout(draw, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [draw, q]);

  const useTemplate = async (t: QuizTemplate) => {
    setUsing(t.id);
    try {
      const d = await api.useTemplate(t.id);
      show(`"${t.title}" copied to your quizzes.`);
      navigate(`/app/quizzes/${d.quiz.id}`);
    } catch (e) {
      show(e instanceof Error ? e.message : 'Could not use template.', true);
      setUsing(null);
    }
  };

  const remove = async (t: QuizTemplate) => {
    const ok = await confirm(
      'Remove template?',
      `"${t.title}" will be removed from the shared gallery. Your published quiz is not affected.`,
      'Remove',
    );
    if (!ok) return;
    try {
      await api.deleteTemplate(t.id);
      show('Template removed.');
      draw();
    } catch (e) {
      show(e instanceof Error ? e.message : 'Could not remove template.', true);
    }
  };

  return (
    <div>
      <PageHead
        title="Templates"
        subtitle="Published quizzes shared by teachers. Clone any template into your own quizzes."
      />
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-52">
          <Input
            placeholder="Search templates…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <select
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className="rounded-xl border border-line bg-paper px-4 py-2.5 text-[15px] text-ink"
          aria-label="Filter by subject"
        >
          <option value="">All subjects</option>
          {subjects.map(s => (
            <option key={s.subject} value={s.subject}>
              {s.subject} ({s.c})
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-ink/50 py-12 text-center">Loading templates…</div>
      ) : templates.length === 0 ? (
        <EmptyState
          title="No templates yet"
          body="When teachers publish quizzes, they appear here for everyone to reuse."
        />
      ) : (
        <>
          <p className="text-[13px] text-ink/50 mb-4">
            {total} template{total === 1 ? '' : 's'}
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {templates.map(t => {
              const mine = user && t.teacher_id === user.id;
              return (
                <div
                  key={t.id}
                  className="rounded-2xl border border-line bg-paper p-5 flex flex-col gap-3"
                >
                  <div>
                    <h3 className="font-semibold text-ink text-[17px] leading-snug">
                      {t.title}
                    </h3>
                    {t.description && (
                      <p className="text-[14px] text-ink/60 mt-1 line-clamp-2">
                        {t.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-[12px]">
                    {t.subject && (
                      <span className="rounded-full bg-sky px-2.5 py-1 text-ink/70">
                        {t.subject}
                      </span>
                    )}
                    <span className="rounded-full bg-neutral px-2.5 py-1 text-ink/60">
                      {t.question_count} question{t.question_count === 1 ? '' : 's'}
                    </span>
                    {t.use_count > 0 && (
                      <span className="rounded-full bg-neutral px-2.5 py-1 text-ink/60">
                        Used {t.use_count}×
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-ink/50">
                    by {t.teacher_name || 'A teacher'}
                    {mine && ' (you)'}
                  </p>
                  <div className="flex gap-2 mt-auto pt-1">
                    <Button
                      onClick={() => useTemplate(t)}
                      disabled={using === t.id}
                      className="flex-1"
                    >
                      {using === t.id ? 'Copying…' : 'Use template'}
                    </Button>
                    {mine && (
                      <Button
                        variant="secondary"
                        onClick={() => remove(t)}
                        aria-label={`Remove template ${t.title}`}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {dialog}
      {toastEl}
    </div>
  );
}
