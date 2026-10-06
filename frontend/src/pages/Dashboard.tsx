import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api/client';
import type { Quiz } from '@/types';
import { PageHead, EmptyState, fmtDate } from '@/components/shared';
import { Button } from '@/components/ui';

function daypart() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-neutral text-ink/60',
    published: 'bg-lime/25 text-ink',
    archived: 'bg-amber-50 text-amber-700',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[status] || colors.draft}`}>
      {status}
    </span>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [recent, setRecent] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

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
  const cards = stats ? [
    { label: 'Total quizzes', value: stats.quizzes || 0 },
    { label: 'Published', value: stats.published || 0 },
    { label: 'Student submissions', value: stats.submissions || 0 },
    { label: 'Bank questions', value: stats.bank || 0 },
  ] : [];

  return (
    <div>
      <PageHead
        title={`Good ${daypart()}, ${firstName}`}
        subtitle="Here is what is happening with your quizzes."
        action={<Link to="/app/quizzes/new"><Button size="sm">+ New quiz</Button></Link>}
      />
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {cards.map(c => (
              <div key={c.label} className="bg-paper border border-line rounded-card p-5">
                <div className="text-2xl font-bold">{c.value}</div>
                <div className="text-[13px] text-ink/55 mt-1">{c.label}</div>
              </div>
            ))}
          </div>
          <h3 className="text-base font-bold mb-3">Recent quizzes</h3>
          {recent.length ? (
            <div className="bg-paper border border-line rounded-card divide-y divide-line/60">
              {recent.map(q => (
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
              <h3 className="font-bold mb-1">No quizzes yet</h3>
              <p className="text-sm text-ink/55 mb-4">Create your first quiz — with AI or by hand.</p>
              <Link to="/app/quizzes/new"><Button>Create quiz</Button></Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
