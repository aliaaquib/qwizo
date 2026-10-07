import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api/client';
import type { BankItem, Difficulty, Question, QuestionType, Quiz, QuizSettings } from '@/types';
import { Button, Card, Input, Textarea, IconButton } from '@/components/ui';
import { PageHead, StatusBadge, useConfirm, useToast } from '@/components/shared';

// Phase 6 — Quiz editor. Single long page, mirroring the vanilla editor's
// behavior exactly: 900ms debounced autosave per question and for quiz meta,
// Saved / Saving… / Unsaved changes states, server-side publish validation,
// and read-only mode once published.

export const QTYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'Multiple choice',
  tf: 'True / False',
  short: 'Short answer',
  fill: 'Fill in the blank',
  matching: 'Matching',
};

const SETTING_DEFS: { key: keyof QuizSettings; label: string; sub: string }[] = [
  { key: 'shuffle_questions', label: 'Shuffle question order', sub: 'Each student sees questions in a different order.' },
  { key: 'shuffle_options', label: 'Shuffle answer options', sub: 'Option order is randomized per student.' },
  { key: 'show_score', label: 'Show score to students', sub: 'Students see their score right after submitting.' },
  { key: 'show_results_immediately', label: 'Show results immediately', sub: 'Students see the per-question review right after submitting. If off, they only see a confirmation.' },
  { key: 'show_correct_answers', label: 'Show correct answers', sub: 'Students can review which answers were correct.' },
  { key: 'show_explanations', label: 'Show explanations', sub: 'Your explanations appear in the student review.' },
  { key: 'allow_multiple_attempts', label: 'Allow multiple attempts', sub: 'Students can take the quiz more than once.' },
  { key: 'require_student_name', label: 'Require student name', sub: 'Students must enter their name before starting.' },
];

const AI_ACTIONS: { key: string; label: string; mcqOnly?: boolean }[] = [
  { key: 'improve', label: 'Improve wording' },
  { key: 'easier', label: 'Make easier' },
  { key: 'harder', label: 'Make harder' },
  { key: 'regenerate', label: 'Regenerate' },
  { key: 'distractors', label: 'Better distractors', mcqOnly: true },
  { key: 'explanation', label: 'Add explanation' },
];

type SaveState = 'saved' | 'saving' | 'dirty';

export const uid = () => crypto.randomUUID();

// The API drops empty accepted answers, so a fresh short/fill question comes
// back with accepted: []. Give the teacher one empty row to type into.
function ensureAcceptedRow(q: Question): Question {
  if ((q.type === 'short' || q.type === 'fill') && !(q.accepted && q.accepted.length)) {
    return { ...q, accepted: [{ id: uid(), text: '' }] };
  }
  return q;
}

interface Proposal {
  text?: string;
  explanation?: string;
  marks?: number;
  difficulty?: Difficulty;
  type?: QuestionType;
  options?: { text: string; is_correct: boolean }[];
  accepted?: string[];
  pairs?: { left?: string; left_text?: string; right?: string; right_text?: string }[];
}

interface AiState {
  working: boolean;
  action: string;
  proposal: Proposal | null;
}

function SavePill({ state }: { state: SaveState }) {
  const label = state === 'saving' ? 'Saving…' : state === 'dirty' ? 'Unsaved changes' : 'Saved';
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap ${
        state === 'saved' ? 'bg-neutral text-ink/60' : state === 'saving' ? 'bg-sky text-ink' : 'bg-lime/50 text-ink'
      }`}
      aria-live="polite"
    >
      <span className={`w-2 h-2 rounded-full ${state === 'saved' ? 'bg-ink/40' : 'bg-ink'}`} />
      {label}
    </span>
  );
}

function MiniLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[12px] font-semibold uppercase tracking-wide text-ink/40 mb-2">{children}</div>;
}

export function QuizEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();
  const { show, el: toastEl } = useToast();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [loading, setLoading] = useState(true);
  const [valErrors, setValErrors] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [qErr, setQErr] = useState<Record<string, string>>({});
  const [aiState, setAiState] = useState<Record<string, AiState>>({});

  const questionsRef = useRef<Question[]>([]);
  const quizRef = useRef<Quiz | null>(null);
  const qTimers = useRef<Record<string, number>>({});
  const metaTimer = useRef<number | null>(null);
  const pendingMeta = useRef<Partial<Quiz> | null>(null);
  const dragId = useRef<string | null>(null);

  const syncQuestions = (qs: Question[]) => {
    questionsRef.current = qs;
    setQuestions(qs);
  };
  const patchQuestion = useCallback((qid: string, patch: Partial<Question>) => {
    const qs = questionsRef.current.map(q => (q.id === qid ? { ...q, ...patch } : q));
    questionsRef.current = qs;
    setQuestions(qs);
  }, []);

  /* ---------------- loading ---------------- */

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await api.getQuiz(id);
      quizRef.current = d.quiz;
      setQuiz(d.quiz);
      const qs = d.questions.map(ensureAcceptedRow);
      questionsRef.current = qs;
      setQuestions(qs);
      setSaveState('saved');
      setValErrors([]);
    } catch (e) {
      show(e instanceof Error ? e.message : 'Failed to load quiz.', true);
    } finally {
      setLoading(false);
    }
  }, [id, show]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------------- autosave ---------------- */

  const collectPayload = (q: Question): Record<string, unknown> => {
    const p: Record<string, unknown> = {
      type: q.type,
      text: q.text,
      explanation: q.explanation,
      marks: q.marks,
      difficulty: q.difficulty,
      case_sensitive: !!q.case_sensitive,
    };
    if (q.type === 'mcq') p.options = q.options.map(o => ({ id: o.id, text: o.text, is_correct: !!o.is_correct }));
    if (q.type === 'tf') {
      p.correct_bool = q.options.some(o => o.is_correct && /^true$/i.test(o.text));
    }
    if (q.type === 'short' || q.type === 'fill') p.accepted = q.accepted.map(a => ({ id: a.id, text: a.text }));
    if (q.type === 'matching') p.pairs = q.pairs.map(x => ({ id: x.id, left_text: x.left_text, right_text: x.right_text }));
    return p;
  };

  const saveQuestion = useCallback(
    async (qid: string) => {
      const q = questionsRef.current.find(x => x.id === qid);
      if (!q) return;
      setSaveState('saving');
      try {
        const r = await api.updateQuestion(qid, collectPayload(q));
        patchQuestion(qid, ensureAcceptedRow(r.question));
        setSaveState('saved');
        setQErr(prev => {
          if (!prev[qid]) return prev;
          const next = { ...prev };
          delete next[qid];
          return next;
        });
      } catch (e) {
        setSaveState('dirty');
        setQErr(prev => ({ ...prev, [qid]: e instanceof Error ? e.message : 'Save failed.' }));
      }
    },
    [patchQuestion],
  );

  const scheduleQuestionSave = useCallback(
    (qid: string) => {
      setSaveState(prev => (prev === 'saved' ? 'dirty' : prev));
      window.clearTimeout(qTimers.current[qid]);
      qTimers.current[qid] = window.setTimeout(() => saveQuestion(qid), 900);
    },
    [saveQuestion],
  );

  // Immediately save a question's pending edits (cancelling its debounce timer).
  // Used before actions that read the question from the server (duplicate, save to bank).
  const flushQuestionSave = useCallback(
    async (qid: string) => {
      if (qTimers.current[qid]) {
        window.clearTimeout(qTimers.current[qid]);
        delete qTimers.current[qid];
        await saveQuestion(qid);
      }
    },
    [saveQuestion],
  );

  const doSaveMeta = useCallback(
    async (meta: Partial<Quiz>) => {
      const qz = quizRef.current;
      if (!qz) return;
      setSaveState('saving');
      try {
        const r = await api.updateQuiz(qz.id, meta);
        quizRef.current = r.quiz;
        setQuiz(r.quiz);
        setSaveState('saved');
      } catch (e) {
        setSaveState('dirty');
        show(e instanceof Error ? e.message : 'Save failed.', true);
      }
    },
    [show],
  );

  const scheduleMetaSave = useCallback(
    (meta: Partial<Quiz>) => {
      setSaveState(prev => (prev === 'saved' ? 'dirty' : prev));
      pendingMeta.current = meta;
      if (metaTimer.current) window.clearTimeout(metaTimer.current);
      metaTimer.current = window.setTimeout(() => {
        pendingMeta.current = null;
        doSaveMeta(meta);
      }, 900);
    },
    [doSaveMeta],
  );

  // Flush any pending saves when leaving the page.
  useEffect(() => {
    const flush = () => {
      Object.values(qTimers.current).forEach(t => window.clearTimeout(t));
      if (metaTimer.current) window.clearTimeout(metaTimer.current);
      const pend = Object.keys(qTimers.current);
      qTimers.current = {};
      metaTimer.current = null;
      const meta = pendingMeta.current;
      pendingMeta.current = null;
      const qz = quizRef.current;
      if (meta && qz) api.updateQuiz(qz.id, meta).catch(() => {});
      pend.forEach(qid => {
        const q = questionsRef.current.find(x => x.id === qid);
        if (q) api.updateQuestion(qid, collectPayload(q)).catch(() => {});
      });
    };
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- question actions ---------------- */

  const addQuestion = async (type: QuestionType) => {
    const qz = quizRef.current;
    if (!qz) return;
    try {
      const body: Partial<Question> & { type: QuestionType } = {
        type,
        text: '',
        marks: 1,
        difficulty: 'medium',
        ...(type === 'mcq'
          ? { options: [{ id: uid(), text: '', is_correct: true }, { id: uid(), text: '', is_correct: false }] }
          : {}),
        ...(type === 'short' || type === 'fill' ? { accepted: [{ id: uid(), text: '' }] } : {}),
        ...(type === 'matching'
          ? { pairs: [{ id: uid(), left_text: '', right_text: '' }, { id: uid(), left_text: '', right_text: '' }] }
          : {}),
      };
      const d = await api.createQuestion(qz.id, body);
      const qs = [...questionsRef.current, ensureAcceptedRow(d.question)];
      syncQuestions(qs);
      show('Question added.');
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-qcard="${d.question.id}"] textarea`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (el as HTMLElement | null)?.focus?.();
      });
    } catch (e) {
      show(e instanceof Error ? e.message : 'Could not add question.', true);
    }
  };

  const questionAction = async (q: Question, act: 'del' | 'dup' | 'bank' | 'up' | 'down') => {
    const qz = quizRef.current;
    if (!qz) return;
    try {
      // Duplicate and save-to-bank read the question from the server —
      // flush any pending autosave first so they copy the latest edits.
      if (act === 'dup' || act === 'bank') await flushQuestionSave(q.id);
      if (act === 'del') {
        const ok = await confirm('Delete question?', 'This question will be permanently removed from the quiz.', 'Delete');
        if (!ok) return;
        await api.deleteQuestion(q.id);
        syncQuestions(questionsRef.current.filter(x => x.id !== q.id));
        show('Question deleted.');
      } else if (act === 'dup') {
        const d = await api.duplicateQuestion(q.id);
        const qs = [...questionsRef.current];
        const idx = qs.findIndex(x => x.id === q.id);
        qs.splice(idx + 1, 0, ensureAcceptedRow(d.question));
        syncQuestions(qs);
        await api.reorderQuestions(qz.id, qs.map(x => x.id));
        show('Question duplicated.');
      } else if (act === 'bank') {
        await api.questionToBank(q.id);
        show('Saved to question bank.');
      } else if (act === 'up' || act === 'down') {
        const qs = [...questionsRef.current];
        const i = qs.findIndex(x => x.id === q.id);
        const j = act === 'up' ? i - 1 : i + 1;
        if (j < 0 || j >= qs.length) return;
        [qs[i], qs[j]] = [qs[j], qs[i]];
        syncQuestions(qs);
        await api.reorderQuestions(qz.id, qs.map(x => x.id));
      }
    } catch (e) {
      show(e instanceof Error ? e.message : 'Action failed.', true);
    }
  };

  const changeQuestionType = async (q: Question, newType: QuestionType) => {
    if (newType === q.type) return;
    const ok = await confirm(
      'Change question type?',
      'The answer data will be reset for the new type. The question text is kept.',
      'Change type',
    );
    if (!ok) return;
    const keep = { text: q.text, explanation: q.explanation, marks: q.marks, difficulty: q.difficulty };
    const fresh: Partial<Question> = {
      ...keep,
      type: newType,
      case_sensitive: false,
      options: [],
      pairs: [],
      accepted: [],
    };
    if (newType === 'mcq')
      fresh.options = [{ id: uid(), text: '', is_correct: true }, { id: uid(), text: '', is_correct: false }];
    if (newType === 'tf')
      fresh.options = [{ id: 't', text: 'True', is_correct: true }, { id: 'f', text: 'False', is_correct: false }];
    if (newType === 'short' || newType === 'fill') fresh.accepted = [{ id: uid(), text: '' }];
    if (newType === 'matching')
      fresh.pairs = [{ id: uid(), left_text: '', right_text: '' }, { id: uid(), left_text: '', right_text: '' }];
    patchQuestion(q.id, fresh);
    window.clearTimeout(qTimers.current[q.id]);
    qTimers.current[q.id] = window.setTimeout(() => saveQuestion(q.id), 300);
  };

  /* ---------------- AI actions ---------------- */

  const runAiAction = async (q: Question, action: string) => {
    setAiState(prev => ({ ...prev, [q.id]: { working: true, action, proposal: null } }));
    try {
      const d = await api.questionAiAction(q.id, action);
      setAiState(prev => ({ ...prev, [q.id]: { working: false, action, proposal: d.proposal as Proposal } }));
    } catch (e) {
      setAiState(prev => ({ ...prev, [q.id]: { working: false, action, proposal: null } }));
      show(e instanceof Error ? e.message : 'AI action failed.', true);
    }
  };

  const acceptProposal = async (q: Question) => {
    const st = aiState[q.id];
    const p = st?.proposal;
    if (!p) return;
    const patch: Partial<Question> = {
      text: p.text ?? q.text,
      explanation: p.explanation ?? q.explanation,
    };
    if (p.marks) patch.marks = p.marks;
    if (p.difficulty) patch.difficulty = p.difficulty;
    if (p.type && p.type !== q.type) {
      setAiState(prev => ({ ...prev, [q.id]: { working: false, action: '', proposal: null } }));
      patchQuestion(q.id, { ...patch, type: p.type, case_sensitive: false, options: [], pairs: [], accepted: [] });
      const nq = questionsRef.current.find(x => x.id === q.id);
      if (nq) await changeQuestionType(nq, p.type);
      return;
    }
    if (p.options) patch.options = p.options.map(o => ({ id: uid(), text: o.text, is_correct: !!o.is_correct }));
    if (p.accepted) patch.accepted = p.accepted.map(t => ({ id: uid(), text: t }));
    if (p.pairs) patch.pairs = p.pairs.map(x => ({ id: uid(), left_text: x.left ?? x.left_text ?? '', right_text: x.right ?? x.right_text ?? '' }));
    setAiState(prev => ({ ...prev, [q.id]: { working: false, action: '', proposal: null } }));
    patchQuestion(q.id, patch);
    await saveQuestion(q.id);
    show('AI suggestion applied.');
  };

  const dismissProposal = (qid: string) =>
    setAiState(prev => ({ ...prev, [qid]: { working: false, action: '', proposal: null } }));

  /* ---------------- drag reorder ---------------- */

  const onDrop = async (targetId: string) => {
    const qz = quizRef.current;
    const did = dragId.current;
    dragId.current = null;
    if (!qz || !did || did === targetId) return;
    const ids = questionsRef.current.map(q => q.id).filter(x => x !== did);
    const ti = ids.indexOf(targetId);
    ids.splice(ti, 0, did);
    syncQuestions(ids.map(x => questionsRef.current.find(q => q.id === x)!).filter(Boolean));
    try {
      await api.reorderQuestions(qz.id, ids);
    } catch (e) {
      show(e instanceof Error ? e.message : 'Reorder failed.', true);
      load();
    }
  };

  /* ---------------- publish ---------------- */

  const publish = async () => {
    const qz = quizRef.current;
    if (!qz) return;
    // Wait for any pending autosaves before validating.
    await new Promise(r => setTimeout(r, 1100));
    setPublishing(true);
    setValErrors([]);
    try {
      const d = await api.publishQuiz(qz.id);
      quizRef.current = d.quiz;
      setQuiz(d.quiz);
      setSaveState('saved');
      show('Published! Share it with your students.');
      navigate(`/app/quizzes/${d.quiz.id}/share`);
    } catch (e) {
      const errs = (e as Error & { errors?: string[] }).errors;
      if (errs && errs.length) {
        setValErrors(errs);
        requestAnimationFrame(() => document.getElementById('valBox')?.scrollIntoView?.({ behavior: 'smooth' }));
      } else {
        show(e instanceof Error ? e.message : 'Publish failed.', true);
      }
    } finally {
      setPublishing(false);
    }
  };

  const unpublish = async () => {
    const qz = quizRef.current;
    if (!qz) return;
    const ok = await confirm(
      'Unpublish quiz?',
      'Students will no longer be able to open the share link. Existing results are kept.',
      'Unpublish',
    );
    if (!ok) return;
    try {
      const d = await api.unpublishQuiz(qz.id);
      quizRef.current = d.quiz;
      setQuiz(d.quiz);
      show('Quiz unpublished.');
    } catch (e) {
      show(e instanceof Error ? e.message : 'Unpublish failed.', true);
    }
  };

  /* ---------------- render ---------------- */

  if (loading) {
    return (
      <div>
        <PageHead title="Quiz editor" subtitle="Loading…" />
        <div className="text-sm text-ink/40 py-8 text-center">Loading quiz…</div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div>
        <PageHead title="Quiz editor" subtitle="The quiz could not be loaded." />
        <Link to="/app/quizzes" className="text-sm text-ink/60 hover:text-ink">← Back to quizzes</Link>
        {dialog}
        {toastEl}
      </div>
    );
  }

  const isPub = quiz.status === 'published';
  const totalMarks = questions.reduce((a, q) => a + (Number(q.marks) || 0), 0);

  const updateMeta = (patch: Partial<Quiz>) => {
    const qz = quizRef.current;
    if (!qz) return;
    const merged = { ...qz, ...patch };
    quizRef.current = merged;
    setQuiz(merged);
  };

  const metaInput = (key: keyof Quiz, parse?: (v: string) => unknown) => ({
    value: String(quiz[key] ?? ''),
    disabled: isPub,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v = parse ? parse(e.target.value) : e.target.value;
      updateMeta({ [key]: v } as Partial<Quiz>);
      scheduleMetaSave({
        title: key === 'title' ? (e.target.value.trim() || 'Untitled quiz') : quizRef.current!.title,
        description: key === 'description' ? e.target.value : quizRef.current!.description,
        subject: key === 'subject' ? e.target.value : quizRef.current!.subject,
        topic: key === 'topic' ? e.target.value : quizRef.current!.topic,
        curriculum: key === 'curriculum' ? e.target.value : quizRef.current!.curriculum,
        level: key === 'level' ? e.target.value : quizRef.current!.level,
        grade: key === 'grade' ? e.target.value : quizRef.current!.grade,
        time_limit_sec: key === 'time_limit_sec' ? (v as number | null) : quizRef.current!.time_limit_sec,
      });
    },
  });

  return (
    <div>
      {/* top bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link to="/app/quizzes" className="icon-btn has-tooltip" aria-label="Back to quizzes">
          ←
        </Link>
        <input
          aria-label="Quiz title"
          className="input-qwizo flex-1 min-w-[180px] px-4 py-2.5 text-base font-semibold bg-paper border border-line rounded-input"
          maxLength={200}
          {...metaInput('title')}
        />
        <SavePill state={saveState} />
        <Link to={`/app/quizzes/${quiz.id}/preview`}>
          <Button variant="secondary" size="sm">Preview</Button>
        </Link>
        {isPub ? (
          <>
            <Button variant="secondary" size="sm" onClick={unpublish}>Unpublish</Button>
            <Link to={`/app/quizzes/${quiz.id}/share`}><Button size="sm">Share</Button></Link>
          </>
        ) : (
          <Button size="sm" onClick={publish} disabled={publishing}>
            {publishing ? 'Checking…' : 'Publish'}
          </Button>
        )}
      </div>

      <PageHead
        title="Quiz editor"
        subtitle={isPub ? 'This quiz is published. Unpublish it to make changes.' : 'Changes save automatically as a draft.'}
      />
      <div className="mb-5"><StatusBadge status={quiz.status} /></div>

      {valErrors.length > 0 && (
        <div id="valBox" className="mb-5 px-5 py-4 text-sm bg-red-50 border border-red-200 rounded-card">
          <h4 className="font-semibold text-red-800 mb-2">This quiz is not ready to publish yet:</h4>
          <ul className="list-disc pl-5 text-red-700 space-y-1">
            {valErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* quiz details */}
      <Card className="p-6 mb-6">
        <h3 className="text-[15px] font-semibold text-ink mb-4">Quiz details</h3>
        <div className="mb-5">
          <label className="block text-sm font-medium text-ink mb-2">Description</label>
          <Textarea maxLength={2000} rows={2} {...metaInput('description')} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Subject</label>
            <Input maxLength={100} {...metaInput('subject')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Topic</label>
            <Input maxLength={200} {...metaInput('topic')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Curriculum</label>
            <Input maxLength={100} {...metaInput('curriculum')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Level / Year</label>
            <Input maxLength={100} {...metaInput('level')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Grade</label>
            <select
              value={quiz.grade || ''}
              onChange={e => {
                const v = e.target.value;
                updateMeta({ grade: v } as Partial<Quiz>);
                scheduleMetaSave({
                  title: quizRef.current!.title,
                  description: quizRef.current!.description,
                  subject: quizRef.current!.subject,
                  topic: quizRef.current!.topic,
                  curriculum: quizRef.current!.curriculum,
                  level: quizRef.current!.level,
                  grade: v,
                  time_limit_sec: quizRef.current!.time_limit_sec,
                });
              }}
              className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[15px]
                focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/30 transition"
            >
              <option value="">Select grade…</option>
              {Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`).map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Time limit (minutes, optional)</label>
            <Input
              type="number"
              min={1}
              max={1440}
              placeholder="No limit"
              disabled={isPub}
              value={quiz.time_limit_sec ? Math.round(quiz.time_limit_sec / 60) : ''}
              onChange={e => {
                const v = e.target.value ? parseInt(e.target.value, 10) * 60 : null;
                updateMeta({ time_limit_sec: v });
                scheduleMetaSave({
                  title: quizRef.current!.title,
                  description: quizRef.current!.description,
                  subject: quizRef.current!.subject,
                  topic: quizRef.current!.topic,
                  curriculum: quizRef.current!.curriculum,
                  level: quizRef.current!.level,
                  time_limit_sec: v,
                });
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Total marks</label>
            <Input value={String(totalMarks)} disabled />
          </div>
        </div>
        <details open={false}>
          <summary className="cursor-pointer text-sm font-semibold text-ink">Quiz settings</summary>
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {SETTING_DEFS.map(s => (
              <label key={s.key} className="flex gap-3 items-start p-3 rounded-control hover:bg-neutral/60 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={!!quiz.settings[s.key]}
                  disabled={isPub}
                  onChange={e => {
                    const settings = { ...quizRef.current!.settings, [s.key]: e.target.checked };
                    updateMeta({ settings });
                    scheduleMetaSave({
                      title: quizRef.current!.title,
                      description: quizRef.current!.description,
                      subject: quizRef.current!.subject,
                      topic: quizRef.current!.topic,
                      curriculum: quizRef.current!.curriculum,
                      level: quizRef.current!.level,
                      time_limit_sec: quizRef.current!.time_limit_sec,
                      settings,
                    });
                  }}
                />
                <span>
                  <b className="block text-sm">{s.label}</b>
                  <small className="text-[13px] text-ink/50">{s.sub}</small>
                </span>
              </label>
            ))}
          </div>
        </details>
      </Card>

      {/* questions */}
      <h3 className="text-[15px] font-semibold text-ink mt-6 mb-3">Questions ({questions.length})</h3>
      <div className="grid gap-4">
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            q={q}
            index={i}
            total={questions.length}
            readOnly={isPub}
            err={qErr[q.id]}
            ai={aiState[q.id]}
            onPatch={patch => {
              patchQuestion(q.id, patch);
              scheduleQuestionSave(q.id);
            }}
            onAction={act => questionAction(q, act)}
            onChangeType={t => changeQuestionType(q, t)}
            onAiAction={a => runAiAction(q, a)}
            onAcceptProposal={() => acceptProposal(q)}
            onDismissProposal={() => dismissProposal(q.id)}
            onDragStart={() => { dragId.current = q.id; }}
            onDragOver={e => { if (dragId.current && dragId.current !== q.id) e.preventDefault(); }}
            onDrop={() => onDrop(q.id)}
          />
        ))}
      </div>

      {!isPub && (
        <div className="flex items-center gap-2 mt-5 flex-wrap">
          <span className="text-[13px] text-ink/50 mr-1">Add:</span>
          {(Object.keys(QTYPE_LABELS) as QuestionType[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => addQuestion(t)}
              className="interact px-3.5 py-2 text-[13px] font-medium bg-paper border border-line rounded-full hover:border-ink/40"
            >
              + {QTYPE_LABELS[t]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setBankOpen(true)}
            className="interact px-3.5 py-2 text-[13px] font-medium bg-paper border border-line rounded-full hover:border-ink/40"
          >
            From bank
          </button>
        </div>
      )}

      {bankOpen && (
        <BankPicker
          onClose={() => setBankOpen(false)}
          onPick={async item => {
            const qz = quizRef.current;
            if (!qz) return;
            try {
              const d = await api.bankAddToQuiz(item.id, qz.id);
              syncQuestions([...questionsRef.current, ensureAcceptedRow(d.question)]);
              setBankOpen(false);
              show('Question added from bank.');
            } catch (e) {
              show(e instanceof Error ? e.message : 'Could not add question.', true);
            }
          }}
        />
      )}

      {dialog}
      {toastEl}
    </div>
  );
}

/* ---------------- question card ---------------- */

interface CardProps {
  q: Question;
  index: number;
  total: number;
  readOnly: boolean;
  err?: string;
  ai?: AiState;
  onPatch: (patch: Partial<Question>) => void;
  onAction: (act: 'del' | 'dup' | 'bank' | 'up' | 'down') => void;
  onChangeType: (t: QuestionType) => void;
  onAiAction: (a: string) => void;
  onAcceptProposal: () => void;
  onDismissProposal: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}

function QuestionCard(props: CardProps) {
  const { q, index, total, readOnly, err, ai } = props;
  const dis = readOnly;

  const scalar = (f: 'text' | 'explanation' | 'marks' | 'difficulty' | 'case_sensitive') => ({
    disabled: dis,
    value: f === 'marks' ? q.marks : f === 'case_sensitive' ? undefined : (q[f] as string),
    checked: f === 'case_sensitive' ? q.case_sensitive : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const v = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked
        : f === 'marks' ? parseFloat(e.target.value) || 0
        : e.target.value;
      props.onPatch({ [f]: v } as Partial<Question>);
    },
  });

  const proposalLabel: Record<string, string> = {
    improve: 'Improved wording',
    easier: 'Easier version',
    harder: 'Harder version',
    regenerate: 'Regenerated',
    distractors: 'New distractors',
    explanation: 'Suggested explanation',
  };

  return (
    <div data-qcard={q.id}>
    <Card className="overflow-hidden">
      <div
        className="flex items-center gap-2.5 px-5 py-3.5 border-b border-line bg-neutral/40"
        draggable={!dis}
        onDragStart={props.onDragStart}
        onDragOver={props.onDragOver}
        onDrop={props.onDrop}
      >
        {!dis && <span className="text-ink/30 cursor-grab select-none" title="Drag to reorder">⠿</span>}
        <span className="text-[13px] font-semibold text-ink/50">Q{index + 1}</span>
        <span className="px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-sky text-ink/70">
          {QTYPE_LABELS[q.type]}
        </span>
        <span className="flex-1" />
        {!dis && (
          <>
            <IconButton label="Move up" onClick={() => index > 0 && props.onAction('up')}>↑</IconButton>
            <IconButton label="Move down" onClick={() => index < total - 1 && props.onAction('down')}>↓</IconButton>
            <IconButton label="Duplicate" onClick={() => props.onAction('dup')}>⧉</IconButton>
            <IconButton label="Save to question bank" onClick={() => props.onAction('bank')}>▤</IconButton>
            <IconButton label="Delete" danger onClick={() => props.onAction('del')}>×</IconButton>
          </>
        )}
      </div>

      <div className="p-5">
        <div className="mb-4">
          <label className="block text-sm font-medium text-ink mb-2">Question</label>
          <Textarea rows={2} {...scalar('text')} className="input-qwizo w-full px-4 py-3 text-[15px] bg-paper border border-line rounded-input" />
        </div>

        <TypeEditor q={q} readOnly={dis} onPatch={props.onPatch} />

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Marks</label>
            <Input type="number" min={0.5} max={100} step={0.5} {...scalar('marks')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Difficulty</label>
            <select
              className="input-qwizo w-full px-4 py-3 text-[15px] bg-paper border border-line rounded-input"
              {...scalar('difficulty')}
            >
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-ink mb-2">
            Explanation <span className="font-normal text-ink/40">(shown to students after submitting, if enabled)</span>
          </label>
          <Textarea rows={2} {...scalar('explanation')} className="input-qwizo w-full px-4 py-3 text-[15px] bg-paper border border-line rounded-input" />
        </div>

        <div className="mt-4">
          <MiniLabel>Change type</MiniLabel>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(QTYPE_LABELS) as QuestionType[]).map(t => (
              <button
                key={t}
                type="button"
                disabled={dis}
                onClick={() => props.onChangeType(t)}
                className={`interact px-3.5 py-2 text-[13px] font-medium rounded-full border ${
                  q.type === t ? 'bg-ink text-white border-ink' : 'bg-paper border-line hover:border-ink/40'
                } disabled:opacity-50`}
              >
                {QTYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {!dis && (
          <div className="mt-4">
            <div className="flex gap-2 flex-wrap">
              {AI_ACTIONS.filter(a => !a.mcqOnly || q.type === 'mcq').map(a => (
                <button
                  key={a.key}
                  type="button"
                  disabled={ai?.working}
                  onClick={() => props.onAiAction(a.key)}
                  className="interact px-3 py-1.5 text-[12.5px] font-medium text-ink/60 bg-neutral rounded-full hover:bg-sky hover:text-ink disabled:opacity-50"
                >
                  ✦ {a.label}
                </button>
              ))}
            </div>
            {ai?.working && <div className="text-[13px] text-ink/50 mt-2.5">Working…</div>}
            {ai?.proposal && (
              <div className="mt-3 p-4 bg-sky/50 border border-sky rounded-card">
                <h4 className="text-sm font-semibold mb-2">✦ {proposalLabel[ai.action] || 'Suggestion'} — review before applying</h4>
                {ai.proposal.text && <p className="text-sm mb-1.5"><b>Question:</b> {ai.proposal.text}</p>}
                {ai.proposal.options && (
                  <p className="text-sm mb-1.5"><b>Options:</b> {ai.proposal.options.map(o => o.text + (o.is_correct ? ' ✓' : '')).join(' · ')}</p>
                )}
                {ai.proposal.accepted && (
                  <p className="text-sm mb-1.5"><b>Accepted:</b> {ai.proposal.accepted.join(' · ')}</p>
                )}
                {ai.proposal.pairs && (
                  <p className="text-sm mb-1.5"><b>Pairs:</b> {ai.proposal.pairs.map(x => `${x.left ?? x.left_text} → ${x.right ?? x.right_text}`).join('; ')}</p>
                )}
                {ai.proposal.explanation && <p className="text-sm mb-1.5"><b>Explanation:</b> {ai.proposal.explanation}</p>}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={props.onAcceptProposal}>Accept</Button>
                  <Button variant="secondary" size="sm" onClick={props.onDismissProposal}>Discard</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {err && (
          <div className="mt-3 px-4 py-2.5 text-[13px] text-red-700 bg-red-50 border border-red-100 rounded-card">
            {err}
          </div>
        )}
      </div>
    </Card>
    </div>
  );
}

/* ---------------- type-specific editors ---------------- */

export function TypeEditor({
  q,
  readOnly,
  onPatch,
}: {
  q: Question;
  readOnly: boolean;
  onPatch: (patch: Partial<Question>) => void;
}) {
  const dis = readOnly;

  if (q.type === 'mcq') {
    return (
      <div>
        <MiniLabel>Answer options — select the correct one</MiniLabel>
        <div className="grid gap-2">
          {q.options.map((o, i) => (
            <div key={o.id} className="flex items-center gap-2.5">
              <button
                type="button"
                title="Mark correct"
                aria-label={`Mark option ${i + 1} correct`}
                disabled={dis}
                onClick={() => onPatch({ options: q.options.map(x => ({ ...x, is_correct: x.id === o.id })) })}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 interact ${
                  o.is_correct ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink/40'
                } disabled:opacity-50`}
              >
                {o.is_correct && <span className="text-[11px]">✓</span>}
              </button>
              <Input
                value={o.text}
                placeholder={`Option ${i + 1}`}
                disabled={dis}
                onChange={e => onPatch({ options: q.options.map(x => (x.id === o.id ? { ...x, text: e.target.value } : x)) })}
              />
              {!dis && q.options.length > 2 && (
                <IconButton label="Remove option" danger onClick={() => {
                  const rest = q.options.filter(x => x.id !== o.id);
                  if (!rest.some(x => x.is_correct) && rest.length) rest[0] = { ...rest[0], is_correct: true };
                  onPatch({ options: rest });
                }}>×</IconButton>
              )}
            </div>
          ))}
        </div>
        {!dis && q.options.length < 6 && (
          <button
            type="button"
            onClick={() => onPatch({ options: [...q.options, { id: uid(), text: '', is_correct: false }] })}
            className="interact mt-2.5 px-4 py-2 text-[13px] font-medium bg-paper border border-line rounded-full hover:border-ink/40"
          >
            + Add option
          </button>
        )}
      </div>
    );
  }

  if (q.type === 'tf') {
    const isTrue = q.options.some(o => o.is_correct && /^true$/i.test(o.text));
    return (
      <div>
        <MiniLabel>Correct answer</MiniLabel>
        <div className="flex gap-2">
          {(['true', 'false'] as const).map(v => {
            const on = (v === 'true') === isTrue;
            return (
              <button
                key={v}
                type="button"
                disabled={dis}
                onClick={() => onPatch({
                  options: [
                    { id: 't', text: 'True', is_correct: v === 'true' },
                    { id: 'f', text: 'False', is_correct: v === 'false' },
                  ],
                })}
                className={`interact px-8 py-2.5 text-sm font-medium rounded-full border ${
                  on ? 'bg-ink text-white border-ink' : 'bg-paper border-line hover:border-ink/40'
                } disabled:opacity-50`}
              >
                {v === 'true' ? 'True' : 'False'}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (q.type === 'short' || q.type === 'fill') {
    return (
      <div>
        <MiniLabel>
          Accepted answers {q.type === 'fill' ? '— use _____ for the blank in the question' : ''}
        </MiniLabel>
        <div className="grid gap-2">
          {q.accepted.map(a => (
            <div key={a.id} className="flex items-center gap-2.5">
              <Input
                value={a.text}
                placeholder="Accepted answer"
                disabled={dis}
                onChange={e => onPatch({ accepted: q.accepted.map(x => (x.id === a.id ? { ...x, text: e.target.value } : x)) })}
              />
              {!dis && (
                <IconButton label="Remove accepted answer" danger onClick={() => {
                  onPatch({ accepted: q.accepted.filter(x => x.id !== a.id) });
                }}>×</IconButton>
              )}
            </div>
          ))}
        </div>
        {!dis && (
          <>
            <button
              type="button"
              onClick={() => onPatch({ accepted: [...q.accepted, { id: uid(), text: '' }] })}
              className="interact mt-2.5 px-4 py-2 text-[13px] font-medium bg-paper border border-line rounded-full hover:border-ink/40"
            >
              + Add accepted answer
            </button>
            <label className="flex gap-3 items-start mt-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={!!q.case_sensitive}
                onChange={e => onPatch({ case_sensitive: e.target.checked })}
              />
              <span>
                <b className="block text-sm">Case sensitive</b>
                <small className="text-[13px] text-ink/50">“Paris” and “paris” count as different answers.</small>
              </span>
            </label>
          </>
        )}
      </div>
    );
  }

  if (q.type === 'matching') {
    return (
      <div>
        <MiniLabel>Pairs</MiniLabel>
        <div className="grid gap-2">
          {q.pairs.map(p => (
            <div key={p.id} className="flex items-center gap-2.5">
              <Input
                value={p.left_text}
                placeholder="Left"
                disabled={dis}
                onChange={e => onPatch({ pairs: q.pairs.map(x => (x.id === p.id ? { ...x, left_text: e.target.value } : x)) })}
              />
              <span className="text-ink/40">→</span>
              <Input
                value={p.right_text}
                placeholder="Right"
                disabled={dis}
                onChange={e => onPatch({ pairs: q.pairs.map(x => (x.id === p.id ? { ...x, right_text: e.target.value } : x)) })}
              />
              {!dis && q.pairs.length > 2 ? (
                <IconButton label="Remove pair" danger onClick={() => {
                  onPatch({ pairs: q.pairs.filter(x => x.id !== p.id) });
                }}>×</IconButton>
              ) : <span className="w-8 shrink-0" />}
            </div>
          ))}
        </div>
        {!dis && q.pairs.length < 8 && (
          <button
            type="button"
            onClick={() => onPatch({ pairs: [...q.pairs, { id: uid(), left_text: '', right_text: '' }] })}
            className="interact mt-2.5 px-4 py-2 text-[13px] font-medium bg-paper border border-line rounded-full hover:border-ink/40"
          >
            + Add pair
          </button>
        )}
      </div>
    );
  }

  return null;
}

/* ---------------- bank picker ---------------- */

function BankPicker({ onClose, onPick }: { onClose: () => void; onPick: (item: BankItem) => void }) {
  const [items, setItems] = useState<BankItem[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listBank()
      .then(d => setItems(d.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(it => !q.trim() || it.text.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative bg-paper rounded-surface shadow-lift max-w-lg w-full p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Add from question bank</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="icon-btn">×</button>
        </div>
        <Input placeholder="Search the bank…" value={q} onChange={e => setQ(e.target.value)} className="mb-4" />
        <div className="overflow-auto grid gap-2">
          {loading ? (
            <div className="text-sm text-ink/40 py-6 text-center">Loading…</div>
          ) : filtered.length ? (
            filtered.map(it => (
              <div key={it.id} className="border border-line rounded-card p-3.5 flex gap-3 items-center">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{it.text || '(untitled)'}</div>
                  <div className="text-[12px] text-ink/50">
                    {QTYPE_LABELS[it.type] || it.type}{it.subject ? ` · ${it.subject}` : ''}
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => onPick(it)}>Add</Button>
              </div>
            ))
          ) : (
            <div className="text-sm text-ink/40 py-6 text-center">No bank questions found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
