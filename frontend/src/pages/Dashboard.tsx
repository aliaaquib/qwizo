import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api/client';
import type { Quiz } from '@/types';
import { PageHead } from '@/components/shared';
import { Button } from '@/components/ui';

function daypart() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    published: 'bg-green-50 text-green-700',
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

  useEffect(() => {
    api.stats()
      .then(d => { setStats(d.stats); setRecent(d.recent); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
        <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {cards.map(c => (
              <div key={c.label} className="bg-white border border-gray-100 rounded-xl p-5">
                <div className="text-2xl font-bold">{c.value}</div>
                <div className="text-[13px] text-gray-500 mt-1">{c.label}</div>
              </div>
            ))}
          </div>
          <h3 className="text-base font-bold mb-3">Recent quizzes</h3>
          {recent.length ? (
            <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
              {recent.map(q => (
                <div key={q.id} className="row-interactive flex items-center gap-4 px-5 py-4 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <Link to={`/app/quizzes/${q.id}`} className="interact font-medium text-[15px] truncate block hover:underline hover:decoration-ink/30 hover:underline-offset-4">
                      {q.title}
                    </Link>
                    <div className="text-xs text-gray-400 mt-0.5">
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
            <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
              <h3 className="font-bold mb-1">No quizzes yet</h3>
              <p className="text-sm text-gray-500 mb-4">Create your first quiz — with AI or by hand.</p>
              <Link to="/app/quizzes/new"><Button>Create quiz</Button></Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
