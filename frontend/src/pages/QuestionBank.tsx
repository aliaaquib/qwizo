import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { BankItem, Difficulty, Question, QuestionType, Quiz } from '@/types';
import { Button, IconButton, Input, Textarea } from '@/components/ui';
import { PageHead, EmptyState, useConfirm, useToast } from '@/components/shared';
import { QTYPE_LABELS, TypeEditor, uid } from '@/pages/QuizEditor';

// Phase 8 — Question bank. Save, find and reuse questions across quizzes.
// Mirrors the vanilla bank view: search + subject/type/difficulty filters,
// add-to-quiz, edit, delete. Editing reuses the quiz editor's TypeEditor.

function bankItemToDraft(item: BankItem): { q: Question; subject: string; topic: string } {
  const p = item.payload || {};
  return {
    q: {
      id: item.id,
      quiz_id: null,
      type: item.type,
      text: item.text,
      explanation: item.explanation,
      marks: item.marks,
      difficulty: item.difficulty,
      case_sensitive: !!p.case_sensitive,
      options: p.options ?? [],
      pairs: p.pairs ?? [],
      accepted: (p.accepted ?? []).map(t => ({ id: uid(), text: t })),
    },
    subject: item.subject,
    topic: item.topic,
  };
}

function blankDraft(type: QuestionType): { q: Question; subject: string; topic: string } {
  const q: Question = {
    id: uid(), quiz_id: null, type, text: '', explanation: '', marks: 1,
    difficulty: 'medium', case_sensitive: false, options: [], pairs: [], accepted: [],
  };
  if (type === 'mcq') q.options = [{ id: uid(), text: '', is_correct: true }, { id: uid(), text: '', is_correct: false }];
  if (type === 'tf') q.options = [{ id: 't', text: 'True', is_correct: true }, { id: 'f', text: 'False', is_correct: false }];
  if (type === 'short' || type === 'fill') q.accepted = [{ id: uid(), text: '' }];
  if (type === 'matching') q.pairs = [{ id: uid(), left_text: '', right_text: '' }, { id: uid(), left_text: '', right_text: '' }];
  return { q, subject: '', topic: '' };
}

function draftToBody(d: { q: Question; subject: string; topic: string }): Record<string, unknown> {
  const { q } = d;
  const body: Record<string, unknown> = {
    type: q.type,
    text: q.text,
    explanation: q.explanation,
    marks: q.marks,
    difficulty: q.difficulty,
    subject: d.subject,
    topic: d.topic,
    case_sensitive: q.case_sensitive,
  };
  if (q.type === 'mcq') body.options = q.options.map(o => ({ text: o.text, is_correct: !!o.is_correct }));
  if (q.type === 'tf') body.options = q.options.map(o => ({ text: o.text, is_correct: !!o.is_correct }));
  if (q.type === 'short' || q.type === 'fill') body.accepted = q.accepted.map(a => a.text);
  if (q.type === 'matching') body.pairs = q.pairs.map(p => ({ left_text: p.left_text, right_text: p.right_text }));
  return body;
}

const TYPE_KEYS = Object.keys(QTYPE_LABELS) as QuestionType[];

export function QuestionBank() {
  const { confirm, dialog } = useConfirm();
  const { show, el: toastEl } = useToast();
  const [items, setItems] = useState<BankItem[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ q: '', subject: '', type: '', difficulty: '' });
  const [editing, setEditing] = useState<{ q: Question; subject: string; topic: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<BankItem | null>(null);

  const draw = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (f.q.trim()) params.q = f.q.trim();
      if (f.subject) params.subject = f.subject;
      if (f.type) params.type = f.type;
      if (f.difficulty) params.difficulty = f.difficulty;
      const d = await api.listBank(params);
      setItems(d.items);
    } catch (e) {
      show(e instanceof Error ? e.message : 'Failed to load bank.', true);
    } finally {
      setLoading(false);
    }
  }, [f, show]);

  useEffect(() => {
    const t = setTimeout(draw, f.q ? 350 : 0);
    return () => clearTimeout(t);
  }, [draw, f.q]);

  // Subject filter options come from the full bank.
  useEffect(() => {
    api.listBank()
      .then(d => setSubjects([...new Set(d.items.map(i => i.subject).filter(Boolean))].sort()))
      .catch(() => {});
  }, []);

  const del = async (item: BankItem) => {
    const ok = await confirm(
      'Delete from bank?',
      'This question will be removed from your bank. Quizzes that already use a copy are not affected.',
      'Delete',
    );
    if (!ok) return;
    try {
      await api.deleteBankItem(item.id);
      show('Removed from bank.');
      draw();
    } catch (e) {
      show(e instanceof Error ? e.message : 'Delete failed.', true);
    }
  };

  const setFilter = (patch: Partial<typeof f>) => setF(prev => ({ ...prev, ...patch }));

  return (
    <div>
      <PageHead
        title="Question Bank"
        subtitle="Save, find and reuse questions across quizzes."
        action={<Button size="sm" onClick={() => { setEditing(blankDraft('mcq')); setEditingId(null); }}>+ New question</Button>}
      />

      <div className="flex gap-2.5 mb-5 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input placeholder="Search questions…" value={f.q} onChange={e => setFilter({ q: e.target.value })} />
        </div>
        <select
          className="input-qwizo px-3 py-2.5 text-sm border border-line rounded-control bg-paper"
          value={f.subject}
          onChange={e => setFilter({ subject: e.target.value })}
          aria-label="Filter by subject"
        >
          <option value="">All subjects</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="input-qwizo px-3 py-2.5 text-sm border border-line rounded-control bg-paper"
          value={f.type}
          onChange={e => setFilter({ type: e.target.value })}
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          {TYPE_KEYS.map(t => <option key={t} value={t}>{QTYPE_LABELS[t]}</option>)}
        </select>
        <select
          className="input-qwizo px-3 py-2.5 text-sm border border-line rounded-control bg-paper"
          value={f.difficulty}
          onChange={e => setFilter({ difficulty: e.target.value })}
          aria-label="Filter by difficulty"
        >
          <option value="">Any difficulty</option>
          <option value="easy">easy</option>
          <option value="medium">medium</option>
          <option value="hard">hard</option>
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-ink/40 py-8 text-center">Loading…</div>
      ) : items.length ? (
        <div className="bg-paper border border-line rounded-card divide-y divide-line/60">
          {items.map(it => (
            <div key={it.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[15px] truncate">{it.text || '(untitled)'}</div>
                <div className="text-xs text-ink/45 mt-0.5">
                  {QTYPE_LABELS[it.type] || it.type}
                  {it.subject ? ` · ${it.subject}` : ''}
                  {it.topic ? ` · ${it.topic}` : ''} · {it.difficulty}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <IconButton label="Add to a quiz" onClick={() => setAddingTo(it)}>+</IconButton>
                <IconButton label="Edit" onClick={() => { setEditing(bankItemToDraft(it)); setEditingId(it.id); }}>⚙</IconButton>
                <IconButton label="Delete" danger onClick={() => del(it)}>×</IconButton>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={f.q || f.subject || f.type || f.difficulty ? 'No questions match' : 'Bank is empty'}
          body={f.q || f.subject || f.type || f.difficulty
            ? 'Try a different search or filter.'
            : 'Save questions from any quiz to reuse them later.'}
        />
      )}

      {editing && (
        <BankEditModal
          draft={editing}
          isNew={editingId === null}
          notify={show}
          onClose={() => { setEditing(null); setEditingId(null); }}
          onSaved={() => { setEditing(null); setEditingId(null); draw(); }}
        />
      )}
      {addingTo && (
        <AddToQuizModal item={addingTo} notify={show} onClose={() => setAddingTo(null)} />
      )}
      {dialog}
      {toastEl}
    </div>
  );
}

/* ---------------- edit modal ---------------- */

function BankEditModal({
  draft,
  isNew,
  notify,
  onClose,
  onSaved,
}: {
  draft: { q: Question; subject: string; topic: string };
  isNew: boolean;
  notify: (msg: string, err?: boolean) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [d, setD] = useState(draft);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const patchQ = (patch: Partial<Question>) => setD(prev => ({ ...prev, q: { ...prev.q, ...patch } }));

  const changeType = (t: QuestionType) => {
    if (t === d.q.type) return;
    const fresh = blankDraft(t).q;
    patchQ({
      type: t, case_sensitive: false,
      options: fresh.options, pairs: fresh.pairs, accepted: fresh.accepted,
    });
  };

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      const body = draftToBody(d);
      if (isNew) await api.createBankItem(body);
      else await api.updateBankItem(d.q.id, body);
      notify(isNew ? 'Added to bank.' : 'Bank question updated.');
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative bg-paper rounded-surface shadow-lift max-w-2xl w-full p-6 max-h-[88vh] overflow-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-medium">{isNew ? 'New bank question' : 'Edit bank question'}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="icon-btn">×</button>
        </div>

        {err && (
          <div className="mb-4 px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-card">{err}</div>
        )}

        <div className="mb-5">
          <label className="block text-sm font-medium text-ink mb-2">Type</label>
          <select
            className="input-qwizo w-full px-4 py-3 text-[15px] bg-paper border border-line rounded-input"
            value={d.q.type}
            onChange={e => changeType(e.target.value as QuestionType)}
          >
            {TYPE_KEYS.map(t => <option key={t} value={t}>{QTYPE_LABELS[t]}</option>)}
          </select>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-ink mb-2">Question</label>
          <Textarea rows={2} value={d.q.text} onChange={e => patchQ({ text: e.target.value })} />
        </div>

        <div className="mb-5">
          <TypeEditor q={d.q} readOnly={false} onPatch={patchQ} />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Marks</label>
            <Input
              type="number" min={0.5} max={100} step={0.5} value={d.q.marks}
              onChange={e => patchQ({ marks: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Difficulty</label>
            <select
              className="input-qwizo w-full px-4 py-3 text-[15px] bg-paper border border-line rounded-input"
              value={d.q.difficulty}
              onChange={e => patchQ({ difficulty: e.target.value as Difficulty })}
            >
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Subject</label>
            <Input value={d.subject} onChange={e => setD(prev => ({ ...prev, subject: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Topic</label>
            <Input value={d.topic} onChange={e => setD(prev => ({ ...prev, topic: e.target.value }))} />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-ink mb-2">Explanation</label>
          <Textarea rows={2} value={d.q.explanation} onChange={e => patchQ({ explanation: e.target.value })} />
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? 'Saving…' : isNew ? 'Add to bank' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- add-to-quiz modal ---------------- */

function AddToQuizModal({ item, notify, onClose }: { item: BankItem; notify: (msg: string, err?: boolean) => void; onClose: () => void }) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizId, setQuizId] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.listQuizzes({ status: 'draft' })
      .then(d => {
        setQuizzes(d.quizzes);
        if (d.quizzes.length) setQuizId(d.quizzes[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const add = async () => {
    if (!quizId) return;
    setAdding(true);
    try {
      await api.bankAddToQuiz(item.id, quizId);
      notify('Added to quiz.');
      onClose();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not add to quiz.', true);
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative bg-paper rounded-surface shadow-lift max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Add to quiz</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="icon-btn">×</button>
        </div>
        <p className="text-sm text-ink/60 mb-4">
          A copy is added — editing it in the quiz never changes the bank original.
        </p>
        {loading ? (
          <div className="text-sm text-ink/40 py-4 text-center">Loading quizzes…</div>
        ) : quizzes.length ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-ink mb-2">Draft quiz</label>
              <select
                className="input-qwizo w-full px-4 py-3 text-[15px] bg-paper border border-line rounded-input"
                value={quizId}
                onChange={e => setQuizId(e.target.value)}
              >
                {quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
              </select>
            </div>
            <Button onClick={add} disabled={adding} className="w-full">
              {adding ? 'Adding…' : 'Add question'}
            </Button>
          </>
        ) : (
          <p className="text-sm text-ink/60">Create a draft quiz first.</p>
        )}
      </div>
    </div>
  );
}

