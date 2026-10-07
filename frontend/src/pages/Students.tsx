import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api/client';
import type { Submission } from '@/types';
import { PageHead, EmptyState, fmtDate } from '@/components/shared';
import { Button } from '@/components/ui';

// Students — unique students aggregated from submissions.

interface StudentRow {
  name: string;
  quizzes: number;
  avg: number;
  lastActive: number;
}

export function Students() {
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

  const students = useMemo<StudentRow[]>(() => {
    const map = new Map<string, { total: number; count: number; last: number; quizzes: Set<string> }>();
    for (const s of subs) {
      const key = s.student_name.trim().toLowerCase();
      if (!key) continue;
      let row = map.get(key);
      if (!row) {
        row = { total: 0, count: 0, last: 0, quizzes: new Set() };
        map.set(key, row);
      }
      row.total += s.percentage;
      row.count += 1;
      row.quizzes.add(s.quiz_id || '');
      if (s.submitted_at > row.last) row.last = s.submitted_at;
    }
    return [...map.entries()]
      .map(([key, r]) => ({
        name: subs.find(s => s.student_name.trim().toLowerCase() === key)?.student_name || key,
        quizzes: r.quizzes.size,
        avg: Math.round(r.total / r.count),
        lastActive: r.last,
      }))
      .sort((a, b) => b.lastActive - a.lastActive);
  }, [subs]);

  return (
    <div>
      <PageHead
        title="Students"
        subtitle={students.length ? `${students.length} student${students.length === 1 ? '' : 's'}` : 'Students who have taken your quizzes.'}
      />
      {loading ? (
        <div className="text-sm text-ink/40 py-8 text-center">Loading…</div>
      ) : loadError ? (
        <EmptyState
          title="Could not load students"
          body="Check your connection and try again."
          action={<Button size="sm" onClick={load}>Retry</Button>}
        />
      ) : students.length ? (
        <div className="bg-paper border border-line rounded-card divide-y divide-line/60">
          {students.map(st => (
            <div key={st.name.toLowerCase()} className="flex items-center gap-4 px-5 py-4">
              <div className="w-10 h-10 rounded-full bg-lime/40 flex items-center justify-center
                text-[15px] font-bold text-ink shrink-0">
                {st.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[15px] truncate">{st.name}</div>
                <div className="text-xs text-ink/40 mt-0.5">
                  {st.quizzes} quiz{st.quizzes === 1 ? '' : 'zes'} · last active {fmtDate(st.lastActive)}
                </div>
              </div>
              <div className="text-[16px] font-bold shrink-0">{st.avg}%</div>
              <div className="text-xs text-ink/40 shrink-0 hidden sm:block">avg score</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-paper border border-line rounded-card p-12 text-center">
          <h3 className="font-bold mb-1">No students yet</h3>
          <p className="text-sm text-ink/55 mb-4">Share a quiz with your students and they will appear here.</p>
          <Link to="/app/quizzes"><Button>Go to My library</Button></Link>
        </div>
      )}
    </div>
  );
}
