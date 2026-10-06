import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '@/lib/api/client';
import type { ReviewItem, StudentResultData } from '@/types';
import { QwizoLogo } from '@/components/QwizoLogo';
import { Card } from '@/components/ui';

// Phase 9 — Student result review. Rendered after submit (via location state)
// and on the bookmarked result link /q/:code/r/:token (fetched by token).

export function StudentShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="py-5 border-b border-line/60">
        <div className="max-w-[720px] mx-auto px-6">
          <Link to="/" aria-label="Qwizo home" className="inline-flex items-center gap-2">
            <QwizoLogo variant="mark" markSize={24} />
          </Link>
        </div>
      </header>
      <main className="flex-1 w-full max-w-[720px] mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

function correctText(c: unknown): string {
  if (Array.isArray(c)) {
    if (c.length && typeof c[0] === 'object' && c[0] !== null) {
      return (c as { left: string; right: string }[]).map(p => `${p.left} → ${p.right}`).join('; ');
    }
    return (c as unknown[]).map(String).join(' / ');
  }
  if (typeof c === 'object' && c !== null) return JSON.stringify(c);
  return String(c ?? '');
}

function ReviewCard({ q, i }: { q: ReviewItem; i: number }) {
  return (
    <Card className={`p-5 border-l-4 ${q.is_correct ? 'border-l-lime' : 'border-l-red-400'}`}>
      <div className="flex items-start gap-3 mb-2">
        <h4 className="font-medium text-[15px] flex-1">Q{i + 1}. {q.text}</h4>
        {q.is_correct !== undefined && (
          <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
            q.is_correct ? 'bg-lime/30 text-ink' : 'bg-red-100 text-red-700'
          }`}>
            {q.is_correct ? 'Correct' : 'Incorrect'}
          </span>
        )}
      </div>
      <div className="font-mono text-[12px] text-ink/45 mb-2">{q.marks_awarded} / {q.marks} marks</div>
      {q.correct !== undefined && q.correct !== null && (
        <p className="text-sm mb-1.5"><span className="font-medium">Correct answer: </span>{correctText(q.correct)}</p>
      )}
      {q.explanation && (
        <div className="text-sm text-ink/60 bg-neutral/60 rounded-card px-4 py-3 mt-2">{q.explanation}</div>
      )}
    </Card>
  );
}

export function StudentResultView({
  code,
  token,
  result,
  quizTitle,
}: {
  code: string;
  token: string | null;
  result: StudentResultData;
  quizTitle: string;
}) {
  const showScore = result.score !== undefined;
  const review = result.questions || [];
  const resultUrl = token ? `${window.location.origin}/q/${code}/r/${token}` : null;

  return (
    <div>
      <Card className="p-8 text-center mb-6">
        <div className="text-[12px] font-medium tracking-[0.18em] text-ink/45 mb-3">
          {quizTitle ? `${quizTitle} — ` : ''}{result.late ? 'SUBMITTED LATE' : 'SUBMITTED'}
        </div>
        {showScore ? (
          <>
            <div className="display text-6xl mb-1">
              {result.score} <span className="text-2xl text-ink/40">/ {result.max_score}</span>
            </div>
            <div className="text-lg font-medium text-ink/70 mb-5">{result.percentage}%</div>
            <div className="flex justify-center gap-8 text-sm">
              <div>Correct <b className="text-lime-700 block text-lg">{result.correct_count}</b></div>
              <div>Incorrect <b className="text-red-600 block text-lg">{result.incorrect_count}</b></div>
              {result.duration_sec != null && (
                <div>Time <b className="block text-lg">{Math.floor(result.duration_sec / 60)}m {result.duration_sec % 60}s</b></div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="display text-3xl mb-3">Submitted</div>
            <p className="text-ink/55 text-[15px]">Your teacher will share your score with you.</p>
          </>
        )}
        {resultUrl && (
          <p className="mt-6 text-[13px] text-ink/45">
            Bookmark this page to view your result later:<br />
            <span className="font-mono text-[12px] break-all">{resultUrl}</span>
          </p>
        )}
      </Card>
      {review.length > 0 && (
        <div className="grid gap-4">
          {review.map((q, i) => <ReviewCard key={q.question_id} q={q} i={i} />)}
        </div>
      )}
    </div>
  );
}

export function StudentResult() {
  const { code, token } = useParams<{ code: string; token: string }>();
  const location = useLocation();
  const passed = location.state as { result?: StudentResultData; quizTitle?: string } | null;
  const [result, setResult] = useState<StudentResultData | null>(passed?.result ?? null);
  const [quizTitle, setQuizTitle] = useState(passed?.quizTitle ?? '');
  const [loading, setLoading] = useState(!passed?.result);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (passed?.result || !token) return;
    api.publicResult(token)
      .then(d => {
        setResult(d.result);
        setQuizTitle(d.quiz_title);
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Result not found.'))
      .finally(() => setLoading(false));
  }, [token, passed]);

  return (
    <StudentShell>
      {loading ? (
        <div className="text-sm text-ink/40 py-12 text-center">Loading result…</div>
      ) : error || !result ? (
        <Card className="p-10 text-center">
          <h1 className="display text-2xl mb-2">Result not found</h1>
          <p className="text-ink/55 text-[15px] mb-6">{error || 'This result link is invalid or has expired.'}</p>
          <Link to="/" className="text-ink underline underline-offset-2 text-[15px]">Back to Qwizo</Link>
        </Card>
      ) : (
        <StudentResultView code={code || ''} token={token || null} result={result} quizTitle={quizTitle} />
      )}
    </StudentShell>
  );
}
