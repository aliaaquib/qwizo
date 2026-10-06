import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/lib/api/client';
import type {
  GradedAnswer, ResultsSummary, SnapshotQuestion, StudentAnswer, Submission, SubmissionDetail,
} from '@/types';
import { Button, Card } from '@/components/ui';
import { PageHead, EmptyState, fmtDate, fmtDur, useToast } from '@/components/shared';

// Phase 10 — Teacher results. Class analytics (submissions, average,
// hardest/easiest question, per-question performance) plus per-submission
// answer review. Mirrors the vanilla results view.

function studentAnswerText(q: SnapshotQuestion | undefined, a: StudentAnswer | null): string {
  if (!a || !q) return '—';
  if (q.type === 'mcq') {
    if ('option_id' in a) {
      const o = q.options.find(x => x.id === a.option_id);
      return o ? o.text : '—';
    }
    return '—';
  }
  if (q.type === 'tf') return 'value' in a ? (a.value === true ? 'True' : a.value === false ? 'False' : '—') : '—';
  if (q.type === 'short' || q.type === 'fill') return 'text' in a && a.text ? a.text : '—';
  if (q.type === 'matching') {
    if (!('matches' in a)) return '—';
    const entries = Object.entries(a.matches);
    if (!entries.length) return '—';
    return entries.map(([l, r]) => {
      const lp = q.pairs.find(p => p.id === l);
      const rp = q.pairs.find(p => p.id === r || p.right_id === r);
      return `${lp ? lp.left : '?'} → ${rp ? rp.right : '?'}`;
    }).join('; ');
  }
  return '—';
}

function SubmissionModal({ subId, onClose }: { subId: string; onClose: () => void }) {
  const [sub, setSub] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSubmission(subId)
      .then(d => setSub(d.submission))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load submission.'))
      .finally(() => setLoading(false));
  }, [subId]);

  const qmap: Record<string, SnapshotQuestion> = {};
  (sub?.snapshot.questions || []).forEach(q => { qmap[q.id] = q; });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative bg-paper rounded-surface shadow-lift max-w-2xl w-full p-6 max-h-[88vh] overflow-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-medium">{sub?.student_name || 'Submission'}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="icon-btn">×</button>
        </div>
        {loading ? (
          <div className="text-sm text-ink/40 py-6 text-center">Loading…</div>
        ) : error || !sub ? (
          <p className="text-sm text-red-700">{error || 'Submission not found.'}</p>
        ) : (
          <>
            <div className="flex gap-8 flex-wrap mb-6">
              <div>
                <div className="text-[12px] text-ink/45">Score</div>
                <div className="text-xl font-bold">{sub.score} / {sub.max_score} ({sub.percentage}%)</div>
              </div>
              <div>
                <div className="text-[12px] text-ink/45">Time taken</div>
                <div className="text-xl font-bold">{fmtDur(sub.duration_sec)}</div>
              </div>
              <div>
                <div className="text-[12px] text-ink/45">Submitted</div>
                <div className="text-[15px] font-semibold">{fmtDate(sub.submitted_at)}{sub.late ? ' (late)' : ''}</div>
              </div>
            </div>
            <div className="grid gap-4">
              {(sub.answers || []).map((a: GradedAnswer, i: number) => {
                const q = qmap[a.question_id];
                return (
                  <Card key={a.question_id} className={`p-5 border-l-4 ${a.is_correct ? 'border-l-lime' : 'border-l-red-400'}`}>
                    <div className="flex items-start gap-3 mb-2">
                      <h5 className="font-medium text-[15px] flex-1">Q{i + 1}. {q?.text || '(question removed)'}</h5>
                      <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                        a.is_correct ? 'bg-lime/30 text-ink' : 'bg-red-100 text-red-700'
                      }`}>
                        {a.is_correct ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>
                    <p className="text-sm mb-1.5">
                      <span className="font-medium">Student answered: </span>
                      {studentAnswerText(q, a.answer)}
                    </p>
                    {q?.explanation && (
                      <p className="text-sm text-ink/60 mb-1.5">
                        <span className="font-medium">Explanation: </span>{q.explanation}
                      </p>
                    )}
                    <p className="text-sm text-ink/55">
                      <span className="font-medium">Marks: </span>{a.marks_awarded} / {q?.marks ?? '—'}
                    </p>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function QuizResults() {
  const { id } = useParams<{ id: string }>();
  const { show, el: toastEl } = useToast();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState<ResultsSummary | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSub, setOpenSub] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [s, subs] = await Promise.all([api.resultsSummary(id), api.listSubmissions(id)]);
      setTitle(s.quiz.title);
      setSummary(s.summary);
      setSubmissions(subs.submissions);
    } catch (e) {
      show(e instanceof Error ? e.message : 'Failed to load results.', true);
    } finally {
      setLoading(false);
    }
  }, [id, show]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div>
        <PageHead title="Results" subtitle="Loading…" />
        <div className="text-sm text-ink/40 py-8 text-center">Loading results…</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div>
        <PageHead title="Results" subtitle="Results could not be loaded." />
        {toastEl}
      </div>
    );
  }

  const s = summary;
  const sorted = [...s.per_question].sort((a, b) => a.correct_pct - b.correct_pct);
  const hardest = sorted[0];
  const easiest = [...s.per_question].sort((a, b) => b.correct_pct - a.correct_pct)[0];

  return (
    <div>
      <PageHead
        title={`Results — ${title}`}
        subtitle={s.total ? `${s.total} submission${s.total === 1 ? '' : 's'} · average ${s.avg_percentage}%` : 'No submissions yet.'}
        action={
          <div className="flex gap-2">
            <Link to={`/app/quizzes/${id}`}><Button variant="secondary" size="sm">Editor</Button></Link>
            <Link to={`/app/quizzes/${id}/share`}><Button variant="secondary" size="sm">Share</Button></Link>
          </div>
        }
      />

      {s.total === 0 ? (
        <EmptyState
          title="No results yet"
          body="Share the quiz with your students — their results will appear here."
          action={<Link to={`/app/quizzes/${id}/share`}><Button size="sm">Share quiz</Button></Link>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { b: String(s.total), l: 'Submissions' },
              { b: `${s.avg_percentage}%`, l: 'Average score' },
              { b: hardest ? `${hardest.correct_pct}%` : '—', l: 'Hardest question' },
              { b: easiest ? `${easiest.correct_pct}%` : '—', l: 'Easiest question' },
            ].map(st => (
              <Card key={st.l} className="p-5 text-center">
                <div className="display text-3xl mb-1">{st.b}</div>
                <div className="text-[13px] text-ink/50">{st.l}</div>
              </Card>
            ))}
          </div>

          <h3 className="text-[16px] font-bold mb-3">Question performance</h3>
          <Card className="p-5 mb-8">
            <div className="grid gap-3">
              {s.per_question.map((p, i) => (
                <div key={p.question_id} className="flex items-center gap-3">
                  <span className="text-sm text-ink/70 flex-1 min-w-0 truncate">
                    Q{i + 1} · {p.text.slice(0, 80)}
                  </span>
                  <div className="w-40 h-2 bg-neutral rounded-full overflow-hidden shrink-0">
                    <div
                      className={`h-full rounded-full ${p.correct_pct < 60 ? 'bg-red-400' : 'bg-lime'}`}
                      style={{ width: `${p.correct_pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-14 text-right tabular-nums">{p.correct_pct}%</span>
                </div>
              ))}
            </div>
          </Card>

          <h3 className="text-[16px] font-bold mb-3">Submissions</h3>
          <div className="bg-paper border border-line rounded-card divide-y divide-line/60">
            {submissions.map(sub => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setOpenSub(sub.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-neutral/40 interact"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[14.5px]">{sub.student_name}</div>
                  <div className="text-[12.5px] text-ink/45">
                    {fmtDate(sub.submitted_at)} · {fmtDur(sub.duration_sec)}{sub.late ? ' · late' : ''}
                  </div>
                </div>
                <span className="text-[13px] font-semibold bg-neutral px-3 py-1.5 rounded-full whitespace-nowrap">
                  {sub.score} / {sub.max_score} · {sub.percentage}%
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {openSub && <SubmissionModal subId={openSub} onClose={() => setOpenSub(null)} />}
      {toastEl}
    </div>
  );
}
