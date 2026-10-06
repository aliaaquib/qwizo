import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api/client';
import type { PublicQuestion, PublicQuiz, StudentAnswer, StudentResultData } from '@/types';
import { Button, Card, Input, ProgressBar } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { useConfirm } from '@/components/shared';
import { StudentResultView, StudentShell } from './StudentResult';

// Phase 9 — Student take flow at /q/:code. Mirrors the vanilla take.js:
// intro → questions (one per screen, timer, progress) → confirm → submit
// → result. No account, mobile-first. Grading stays server-side.

type Phase = 'loading' | 'error' | 'intro' | 'taking' | 'submitting' | 'submitted';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmtTime(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(sec).padStart(2, '0')}`;
}

function QuestionText({ text }: { text: string }) {
  const parts = text.split('_____');
  if (parts.length === 1) return <>{text || <span className="text-ink/30">(empty question)</span>}</>;
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p}
          {i < parts.length - 1 && (
            <span className="inline-block border-b-2 border-ink/40 w-20 mx-1" aria-hidden="true" />
          )}
        </Fragment>
      ))}
    </>
  );
}

function isAnswered(q: PublicQuestion, a: StudentAnswer | undefined): boolean {
  if (!a) return false;
  if (q.type === 'mcq') return !!('option_id' in a && a.option_id);
  if (q.type === 'tf') return 'value' in a && typeof a.value === 'boolean';
  if (q.type === 'short' || q.type === 'fill') return !!('text' in a && a.text.trim());
  if (q.type === 'matching') return 'matches' in a && Object.keys(a.matches).length > 0;
  return false;
}

function AnswerZone({
  q,
  answer,
  onAnswer,
}: {
  q: PublicQuestion;
  answer: StudentAnswer | undefined;
  onAnswer: (a: StudentAnswer) => void;
}) {
  if (q.type === 'mcq') {
    const sel = answer && 'option_id' in answer ? answer.option_id : null;
    return (
      <div className="grid gap-2.5">
        {(q.options || []).map((o, i) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onAnswer({ option_id: o.id })}
            className={`interact flex items-center gap-3.5 px-5 py-4 text-left bg-paper border rounded-card ${
              sel === o.id ? 'border-ink shadow-soft' : 'border-line hover:border-ink/30'
            }`}
          >
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold ${
              sel === o.id ? 'bg-ink text-white' : 'bg-neutral text-ink/60'
            }`}>
              {'ABCDEFGHIJ'[i] || '•'}
            </span>
            <span className="text-[15px]">{o.text}</span>
          </button>
        ))}
      </div>
    );
  }

  if (q.type === 'tf') {
    const sel = answer && 'value' in answer ? answer.value : null;
    return (
      <div className="flex gap-2.5">
        {[true, false].map(v => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onAnswer({ value: v })}
            className={`interact flex-1 px-6 py-3.5 text-[15px] font-medium rounded-full border ${
              sel === v ? 'bg-ink text-white border-ink' : 'bg-paper border-line hover:border-ink/30'
            }`}
          >
            {v ? 'True' : 'False'}
          </button>
        ))}
      </div>
    );
  }

  if (q.type === 'short' || q.type === 'fill') {
    return (
      <Input
        value={answer && 'text' in answer ? answer.text : ''}
        onChange={e => onAnswer({ text: e.target.value })}
        placeholder="Type your answer"
        aria-label="Your answer"
        autoComplete="off"
        className="py-3.5 text-[15px]"
      />
    );
  }

  if (q.type === 'matching') {
    const matches = answer && 'matches' in answer ? answer.matches : {};
    return (
      <div className="grid gap-4">
        {(q.lefts || []).map(l => (
          <div key={l.id}>
            <div className="font-semibold text-ink mb-1.5">{l.text}</div>
            <select
              className="input-qwizo w-full px-4 py-3 text-[15px] bg-paper border border-line rounded-input"
              aria-label={`Match for ${l.text}`}
              value={matches[l.id] || ''}
              onChange={e => {
                const next = { ...matches };
                if (e.target.value) next[l.id] = e.target.value;
                else delete next[l.id];
                onAnswer({ matches: next });
              }}
            >
              <option value="">Choose a match…</option>
              {(q.rights || []).map(r => (
                <option key={r.id} value={r.id}>{r.text}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export function TakeQuiz() {
  const { code: rawCode } = useParams<{ code: string }>();
  const code = (rawCode || '').toUpperCase();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();

  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState<PublicQuiz | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  const [index, setIndex] = useState(0);
  const [name, setName] = useState('');
  const [startErr, setStartErr] = useState('');
  const [starting, setStarting] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [result, setResult] = useState<StudentResultData | null>(null);
  const [resultToken, setResultToken] = useState<string | null>(null);
  const submittedRef = useRef(false);

  // Mutable snapshot for the timer: the interval closure must always submit
  // the latest answers, not the ones from the render when it was created.
  const liveRef = useRef({ attemptId, answers, code, quizTitle: '' });
  liveRef.current = { attemptId, answers, code, quizTitle: quiz?.title || '' };

  // Load the public quiz.
  useEffect(() => {
    if (!code) {
      setError('This link is incomplete.');
      setPhase('error');
      return;
    }
    api.publicQuiz(code)
      .then(d => {
        if (!d.quiz.questions.length) {
          setError('This quiz has no questions.');
          setPhase('error');
          return;
        }
        setQuiz(d.quiz);
        setPhase('intro');
      })
      .catch(e => {
        setError(e instanceof Error ? e.message : 'Quiz not found. Check the code and try again.');
        setPhase('error');
      });
  }, [code]);

  const startQuiz = async () => {
    if (!quiz || starting) return;
    setStarting(true);
    setStartErr('');
    try {
      const d = await api.publicStart(code, name.trim());
      const s = quiz.settings;
      let qs = [...quiz.questions];
      if (s.shuffle_questions) qs = shuffle(qs);
      if (s.shuffle_options) {
        qs = qs.map(q => ({
          ...q,
          options: q.options ? shuffle(q.options) : q.options,
          rights: q.rights ? shuffle(q.rights) : q.rights,
        }));
      }
      setQuestions(qs);
      setAttemptId(d.attempt_id);
      setExpiresAt(d.expires_at);
      setIndex(0);
      setPhase('taking');
    } catch (e) {
      setStartErr(e instanceof Error ? e.message : 'Could not start the quiz.');
      setStarting(false);
    }
  };

  const doSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    const snap = liveRef.current;
    if (!snap.attemptId) return;
    submittedRef.current = true;
    setPhase('submitting');
    try {
      const d = await api.publicSubmit(snap.code, snap.attemptId, snap.answers);
      setResult(d.result);
      setResultToken(d.result_token);
      setPhase('submitted');
      navigate(`/q/${snap.code}/r/${d.result_token}`, {
        replace: true,
        state: { result: d.result, quizTitle: snap.quizTitle },
      });
    } catch (e) {
      submittedRef.current = false;
      setError(e instanceof Error ? e.message : 'Submission failed.');
      setPhase('error');
    }
  }, [navigate]);

  const confirmSubmit = async () => {
    const done = questions.filter(q => isAnswered(q, answers[q.id])).length;
    const ok = await confirm(
      'Submit quiz?',
      `You answered ${done} of ${questions.length} questions. Once submitted, you cannot change your answers.`,
      'Submit',
    );
    if (ok) doSubmit();
  };

  // Timer: tick every second, auto-submit at zero.
  useEffect(() => {
    if (phase !== 'taking' || !expiresAt) {
      setTimeLeft(null);
      return;
    }
    const tick = () => {
      const left = expiresAt - Date.now();
      setTimeLeft(left);
      if (left <= 0) doSubmit();
    };
    tick();
    const int = setInterval(tick, 1000);
    return () => clearInterval(int);
  }, [phase, expiresAt, doSubmit]);

  if (phase === 'loading') {
    return (
      <StudentShell>
        <div className="text-sm text-ink/40 py-12 text-center">Loading quiz…</div>
      </StudentShell>
    );
  }

  if (phase === 'error') {
    return (
      <StudentShell>
        <Card className="p-10 text-center">
          <h1 className="display text-2xl mb-2">Something went wrong</h1>
          <p className="text-ink/55 text-[15px] mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Link to="/join"><Button variant="secondary">Try another code</Button></Link>
            <Link to="/"><Button variant="secondary">Back to Qwizo</Button></Link>
          </div>
        </Card>
      </StudentShell>
    );
  }

  if (phase === 'intro' && quiz) {
    const mins = quiz.time_limit_sec ? Math.round(quiz.time_limit_sec / 60) : null;
    return (
      <StudentShell>
        <Card className="p-8 md:p-10">
          <div className="text-[12px] font-medium tracking-[0.18em] text-ink/45 mb-2">
            {(quiz.subject || 'QUIZ').toUpperCase()}
          </div>
          <h1 className="display text-3xl mb-3">{quiz.title}</h1>
          {quiz.description && <p className="text-ink/60 text-[15px] mb-6">{quiz.description}</p>}
          <div className="flex gap-8 text-sm mb-6">
            <div>Questions <b className="block text-lg">{quiz.questions.length}</b></div>
            <div>Time limit <b className="block text-lg">{mins ? `${mins} min` : 'No limit'}</b></div>
          </div>
          {startErr && (
            <div className="mb-4 px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-card">
              {startErr}
            </div>
          )}
          {quiz.settings.require_student_name && (
            <div className="mb-5">
              <label htmlFor="stu-name" className="block text-sm font-medium text-ink mb-2">Your name</label>
              <Input
                id="stu-name"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') startQuiz(); }}
                placeholder="e.g. Aiza"
                autoComplete="name"
                maxLength={80}
              />
            </div>
          )}
          <Button onClick={startQuiz} disabled={starting} className="w-full">
            {starting ? 'Starting…' : 'Start quiz'}
          </Button>
        </Card>
      </StudentShell>
    );
  }

  if (phase === 'submitting') {
    return (
      <StudentShell>
        <div className="text-sm text-ink/50 py-12 text-center">Submitting your answers…</div>
      </StudentShell>
    );
  }

  if (phase === 'taking' && quiz) {
    const q = questions[index];
    const total = questions.length;
    const timerCls = timeLeft != null && timeLeft < 60_000
      ? 'text-red-600 font-semibold'
      : timeLeft != null && timeLeft < 5 * 60_000
        ? 'text-amber-600 font-semibold'
        : 'text-ink/60';

    return (
      <div className="min-h-screen bg-paper flex flex-col">
        <header className="py-4 border-b border-line/60 sticky top-0 bg-paper/95 backdrop-blur z-10">
          <div className="max-w-[720px] mx-auto px-6 flex items-center gap-4">
            <Logo markSize={22} />
            <div className="flex-1"><ProgressBar value={index + 1} max={total} /></div>
            <span className="text-[13px] font-medium text-ink/50 whitespace-nowrap">{index + 1} / {total}</span>
            {timeLeft != null && (
              <span className={`text-[13px] tabular-nums ${timerCls}`} aria-label="Time remaining">
                {fmtTime(timeLeft)}
              </span>
            )}
          </div>
        </header>
        <main className="flex-1 w-full max-w-[720px] mx-auto px-6 py-8">
          {q && (
            <Card className="p-6 md:p-8 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-medium text-ink/45">Question {index + 1}</span>
                <span className="text-[13px] text-ink/45">{q.marks} {q.marks === 1 ? 'mark' : 'marks'}</span>
              </div>
              <h2 className="text-[19px] font-medium mb-5"><QuestionText text={q.text} /></h2>
              <AnswerZone
                q={q}
                answer={answers[q.id]}
                onAnswer={a => setAnswers(prev => ({ ...prev, [q.id]: a }))}
              />
            </Card>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={index === 0}>
              Previous
            </Button>
            <span className="flex-1" />
            {index === total - 1 ? (
              <Button onClick={confirmSubmit}>Review &amp; submit</Button>
            ) : (
              <Button onClick={() => setIndex(i => i + 1)}>Next</Button>
            )}
          </div>
        </main>
        {dialog}
      </div>
    );
  }

  // 'submitted' navigates away; keep a fallback render.
  if (phase === 'submitted' && result) {
    return (
      <StudentShell>
        <StudentResultView code={code} token={resultToken} result={result} quizTitle={quiz?.title || ''} />
      </StudentShell>
    );
  }

  return null;
}
