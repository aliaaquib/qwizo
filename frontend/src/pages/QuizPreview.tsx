import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/lib/api/client';
import type { Question, Quiz } from '@/types';
import { Button, Card, ProgressBar } from '@/components/ui';
import { PageHead, EmptyState, useToast } from '@/components/shared';

// Phase 7 — Quiz preview. Exactly what students will see; answers here are
// selectable for feel but are never recorded. Mirrors the vanilla preview.

function PreviewAnswer({ q }: { q: Question }) {
  const [sel, setSel] = useState<string | null>(null);

  if (q.type === 'mcq') {
    return (
      <div className="grid gap-2.5">
        {q.options.map((o, i) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setSel(o.id)}
            className={`interact flex items-center gap-3.5 px-5 py-4 text-left bg-paper border rounded-card ${
              sel === o.id ? 'border-ink shadow-soft' : 'border-line hover:border-ink/30'
            }`}
          >
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold ${
              sel === o.id ? 'bg-ink text-white' : 'bg-neutral text-ink/60'
            }`}>
              {'ABCDEF'[i]}
            </span>
            <span className="text-[15px]">{o.text || <span className="text-ink/30">Option {i + 1}</span>}</span>
          </button>
        ))}
      </div>
    );
  }

  if (q.type === 'tf') {
    return (
      <div className="flex gap-2.5">
        {['True', 'False'].map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setSel(v)}
            className={`interact flex-1 px-6 py-3.5 text-[15px] font-medium rounded-full border ${
              sel === v ? 'bg-ink text-white border-ink' : 'bg-paper border-line hover:border-ink/30'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    );
  }

  if (q.type === 'short' || q.type === 'fill') {
    return (
      <input
        className="input-qwizo w-full px-4 py-3.5 text-[15px] bg-paper border border-line rounded-input placeholder:text-ink/30"
        placeholder="Type your answer"
        aria-label="Your answer"
      />
    );
  }

  if (q.type === 'matching') {
    const rights = q.pairs.map(p => p.right_text);
    return (
      <div className="grid gap-4">
        {q.pairs.map(p => (
          <div key={p.id}>
            <div className="font-semibold text-ink mb-1.5">{p.left_text}</div>
            <select
              className="input-qwizo w-full px-4 py-3 text-[15px] bg-paper border border-line rounded-input"
              aria-label={`Match for ${p.left_text}`}
              defaultValue=""
            >
              <option value="" disabled>Choose…</option>
              {rights.map((r, i) => (
                <option key={i} value={r}>{r}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export function QuizPreview() {
  const { id } = useParams<{ id: string }>();
  const { show, el: toastEl } = useToast();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.getQuiz(id)
      .then(d => {
        setQuiz(d.quiz);
        setQuestions(d.questions);
      })
      .catch(e => show(e instanceof Error ? e.message : 'Failed to load quiz.', true))
      .finally(() => setLoading(false));
  }, [id, show]);

  if (loading) {
    return (
      <div>
        <PageHead title="Preview" subtitle="Loading…" />
        <div className="text-sm text-ink/40 py-8 text-center">Loading preview…</div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div>
        <PageHead title="Preview" subtitle="The quiz could not be loaded." />
        <Link to="/app/quizzes" className="text-sm text-ink/60 hover:text-ink">← Back to quizzes</Link>
        {toastEl}
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div>
        <PageHead
          title="Preview"
          subtitle="Exactly what your students will see. Answers here are not recorded."
          action={<Link to={`/app/quizzes/${quiz.id}`}><Button variant="secondary" size="sm">Back to editor</Button></Link>}
        />
        <EmptyState
          title="No questions yet"
          body="Add questions in the editor to preview them."
          action={<Link to={`/app/quizzes/${quiz.id}`}><Button size="sm">Open editor</Button></Link>}
        />
        {toastEl}
      </div>
    );
  }

  const q = questions[idx];

  return (
    <div>
      <PageHead
        title="Preview"
        subtitle="Exactly what your students will see. Answers here are not recorded."
        action={<Link to={`/app/quizzes/${quiz.id}`}><Button variant="secondary" size="sm">Back to editor</Button></Link>}
      />
      <Card className="p-6 md:p-8 max-w-[720px]">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[13px] font-semibold text-ink/50 whitespace-nowrap">
            Q{idx + 1} / {questions.length}
          </span>
          <div className="flex-1">
            <ProgressBar value={idx + 1} max={questions.length} />
          </div>
        </div>
        <h3 className="text-[19px] text-ink font-medium my-4">
          {q.text.replace(/_____/g, '______') || <span className="text-ink/30">(empty question)</span>}
        </h3>
        <PreviewAnswer key={q.id} q={q} />
        <div className="flex gap-2.5 mt-6 items-center">
          <Button variant="secondary" size="sm" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>
            Previous
          </Button>
          <span className="flex-1" />
          {idx < questions.length - 1 ? (
            <Button size="sm" onClick={() => setIdx(i => i + 1)}>Next</Button>
          ) : (
            <span className="text-[13px] text-ink/50">End of preview</span>
          )}
        </div>
      </Card>
      {toastEl}
    </div>
  );
}
