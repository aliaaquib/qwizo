import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { PageHead, useToast } from '@/components/shared';
import { AsyncButton, Button } from '@/components/ui';

// Phase 11: AI generation wired up — prompt mode and upload mode.
export function QuizNew() {
  const [busy, setBusy] = useState(false);
  const { show, el: toastEl } = useToast();
  const navigate = useNavigate();

  const createManual = async () => {
    setBusy(true);
    try {
      const d = await api.createQuiz({ title: 'Untitled quiz' });
      navigate(`/app/quizzes/${d.quiz.id}`);
    } catch (e) {
      show(e instanceof Error ? e.message : 'Failed to create quiz.', true);
      setBusy(false);
    }
  };

  const cards = [
    {
      title: 'Create with AI',
      body: 'Describe the quiz — topic, level, question types — and Qwizo drafts the questions. You review everything before publishing.',
      action: <Link to="/app/quizzes/new/ai"><Button size="sm">Start with AI</Button></Link>,
      note: null,
    },
    {
      title: 'Create from material',
      body: 'Upload a .txt or .docx handout and generate a quiz grounded in its content. Nothing is invented outside your material.',
      action: <Link to="/app/quizzes/new/ai-upload"><Button variant="secondary" size="sm">Upload material</Button></Link>,
      note: null,
    },
    {
      title: 'Create manually',
      body: 'A blank quiz with the full editor. Add each question yourself, exactly the way you want it.',
      action: (
        <AsyncButton
          variant="secondary"
          size="sm"
          onClick={createManual}
          state={busy ? 'busy' : 'idle'}
          idle="Blank quiz"
          busy="Creating…"
          done="Created"
        />
      ),
      note: null,
    },
  ];

  return (
    <div>
      <PageHead
        title="Create a quiz"
        subtitle="Start with AI, from your material, or from a blank page."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(c => (
          <div key={c.title} className="bg-paper border border-line rounded-card p-6 flex flex-col">
            <h4 className="font-bold mb-2">{c.title}</h4>
            <p className="text-sm text-ink/55 mb-5 flex-1">{c.body}</p>
            {c.action}
            {c.note && <div className="text-xs text-ink/40 mt-2">{c.note}</div>}
          </div>
        ))}
      </div>
      {toastEl}
    </div>
  );
}
