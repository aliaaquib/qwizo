import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api/client';
import type { Submission } from '@/types';
import { PageHead, EmptyState, fmtDate } from '@/components/shared';
import { Button } from '@/components/ui';

// Reports — every student submission across all quizzes, newest first.

export function Reports() {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    api.listAllSubmissions()
      .then(d => setSubs(d.submissions))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const avg = subs.length
    ? Math.round(subs.reduce((a, s) => a + s.percentage, 0) / subs.length)
    : 0;

  return (
    <div>
      <PageHead
        title="Reports"
        subtitle={subs.length ? `${subs.length} submissions · ${avg}% average score` : 'Student submissions across your quizzes.'}
      />
      {loading ? (
        <div className="text-sm text-ink/40 py-8 text-center">Loading…</div>
      ) : loadError ? (
        <EmptyState
          title="Could not load reports"
          body="Check your connection and try again."
          action={<Button size="sm" onClick={load}>Retry</Button>}
        />
      ) : subs.length ? (
        <div className="bg-paper border border-line rounded-card divide-y divide-line/60">
          {subs.map(s => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-10 h-10 rounded-full bg-sky flex items-center justify-center
                text-[15px] font-bold text-ink shrink-0">
                {(s.student_name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[15px] truncate">{s.student_name}</div>
                <div className="text-xs text-ink/40 mt-0.5 truncate">
                  {s.quiz_title} · {fmtDate(s.submitted_at)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-[16px] font-bold ${s.percentage >= 70 ? 'text-ink' : s.percentage >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                  {Math.round(s.percentage)}%
                </div>
                <div className="text-xs text-ink/40">
                  {s.correct_count}/{s.correct_count + s.incorrect_count} correct
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-paper border border-line rounded-card p-12 text-center">
          <h3 className="font-bold mb-1">No submissions yet</h3>
          <p className="text-sm text-ink/55 mb-4">Share a quiz with your students and their results will appear here.</p>
          <Link to="/app/quizzes"><Button>Go to My library</Button></Link>
        </div>
      )}
    </div>
  );
}
