import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import type { Difficulty, QuestionType } from '@/types';
import { Button, Card, Input, Textarea } from '@/components/ui';
import { PageHead, useToast } from '@/components/shared';
import { QTYPE_LABELS } from '@/pages/QuizEditor';

// Phase 11 — AI quiz generation. Two modes: from a prompt, or grounded in an
// uploaded .txt/.docx handout. The quiz is always created as a draft; the
// teacher reviews everything in the editor before publishing. Mirrors the
// vanilla AICreateView.

const TYPE_KEYS = Object.keys(QTYPE_LABELS) as QuestionType[];
const PROMPT_STEPS = ['Reading your request…', 'Drafting questions…', 'Checking each question…', 'Assembling your quiz…'];
const UPLOAD_STEPS = ['Uploading your material…', 'Reading the document…', 'Drafting questions from it…', 'Checking each question…'];

export function AiCreate({ mode }: { mode: 'prompt' | 'upload' }) {
  const navigate = useNavigate();
  const { show, el: toastEl } = useToast();
  const [prompt, setPrompt] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [curriculum, setCurriculum] = useState('');
  const [level, setLevel] = useState('');
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [types, setTypes] = useState<QuestionType[]>(['mcq', 'short']);
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const stepInt = useRef<number | null>(null);

  const steps = mode === 'upload' ? UPLOAD_STEPS : PROMPT_STEPS;

  useEffect(() => {
    if (!generating) return;
    setStep(0);
    stepInt.current = window.setInterval(() => {
      setStep(s => Math.min(s + 1, steps.length - 1));
    }, 4000);
    return () => {
      if (stepInt.current) window.clearInterval(stepInt.current);
    };
  }, [generating, steps.length]);

  const toggleType = (t: QuestionType) => {
    setTypes(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]));
  };

  const generate = async () => {
    setErr(null);
    if (!types.length) {
      setErr('Pick at least one question type.');
      return;
    }
    if (mode === 'prompt' && !prompt.trim() && !topic.trim()) {
      setErr('Describe the quiz or enter a topic.');
      return;
    }
    if (mode === 'upload') {
      if (!file) {
        setErr('Choose a .txt or .docx file first.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErr('The file is too large — 5 MB max.');
        return;
      }
    }

    setGenerating(true);
    try {
      const common = {
        prompt: prompt.trim(),
        subject: subject.trim(),
        curriculum: curriculum.trim(),
        level: level.trim(),
        topic: topic.trim(),
        count: Math.min(Math.max(count || 10, 1), 40),
        difficulty,
        types,
      };
      let d;
      if (mode === 'upload' && file) {
        const fd = new FormData();
        fd.append('file', file);
        Object.entries(common).forEach(([k, v]) =>
          fd.append(k, Array.isArray(v) ? v.join(',') : String(v)),
        );
        d = await api.aiGenerateUpload(fd);
      } else {
        d = await api.aiGenerate(common);
      }
      show(`Your quiz is ready — ${d.questions.length} questions drafted for review.`);
      navigate(`/app/quizzes/${d.quiz.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Generation failed.');
      setGenerating(false);
    }
  };

  return (
    <div>
      <PageHead
        title={mode === 'upload' ? 'Create from material' : 'Create with AI'}
        subtitle="The quiz is always created as a draft for your review."
      />
      <Card className="p-6 md:p-8 max-w-[720px]">
        {err && (
          <div className="mb-5 px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-card">
            {err}
          </div>
        )}

        {mode === 'upload' ? (
          <>
            <div className="mb-5">
              <label htmlFor="ai-file" className="block text-sm font-medium text-ink mb-2">
                Learning material (.txt or .docx, max 5 MB)
              </label>
              <Input
                id="ai-file"
                type="file"
                accept=".txt,.docx,text/plain"
                onChange={e => setFile(e.target.files?.[0] || null)}
                disabled={generating}
              />
              <p className="text-[13px] text-ink/45 mt-1.5">
                PDF is not supported yet — export it as .txt or .docx. Scanned images cannot be read.
              </p>
            </div>
            <div className="mb-5">
              <label htmlFor="ai-prompt" className="block text-sm font-medium text-ink mb-2">
                What should the quiz focus on? (optional)
              </label>
              <Input
                id="ai-prompt"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="e.g. Focus on solving two-step equations"
                disabled={generating}
              />
            </div>
          </>
        ) : (
          <div className="mb-5">
            <label htmlFor="ai-prompt" className="block text-sm font-medium text-ink mb-2">
              Describe the quiz
            </label>
            <Textarea
              id="ai-prompt"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Create a Year 8 Cambridge Mathematics quiz about linear equations."
              rows={3}
              disabled={generating}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label htmlFor="ai-subject" className="block text-sm font-medium text-ink mb-2">Subject</label>
            <Input id="ai-subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Mathematics" disabled={generating} />
          </div>
          <div>
            <label htmlFor="ai-topic" className="block text-sm font-medium text-ink mb-2">Topic</label>
            <Input id="ai-topic" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Linear equations" disabled={generating} />
          </div>
          <div>
            <label htmlFor="ai-cur" className="block text-sm font-medium text-ink mb-2">Curriculum</label>
            <Input id="ai-cur" value={curriculum} onChange={e => setCurriculum(e.target.value)} placeholder="Cambridge" disabled={generating} />
          </div>
          <div>
            <label htmlFor="ai-level" className="block text-sm font-medium text-ink mb-2">Level / Year</label>
            <Input id="ai-level" value={level} onChange={e => setLevel(e.target.value)} placeholder="Year 8" disabled={generating} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label htmlFor="ai-count" className="block text-sm font-medium text-ink mb-2">Number of questions</label>
            <Input
              id="ai-count"
              type="number" min={1} max={40} value={count}
              onChange={e => setCount(parseInt(e.target.value, 10) || 0)}
              disabled={generating}
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-ink mb-2">Difficulty</span>
            <div className="flex rounded-full border border-line overflow-hidden" role="group" aria-label="Difficulty">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  disabled={generating}
                  className={`interact flex-1 py-2.5 text-sm font-medium capitalize ${
                    difficulty === d ? 'bg-ink text-white' : 'bg-paper text-ink/60 hover:text-ink'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <span className="block text-sm font-medium text-ink mb-2">Question types</span>
          <div className="flex flex-wrap gap-2">
            {TYPE_KEYS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                disabled={generating}
                aria-pressed={types.includes(t)}
                className={`interact px-4 py-2 rounded-full text-sm font-medium border ${
                  types.includes(t)
                    ? 'bg-ink text-white border-ink'
                    : 'bg-paper border-line text-ink/60 hover:border-ink/30'
                }`}
              >
                {QTYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2.5">
          <Link to="/app/quizzes/new"><Button variant="secondary" disabled={generating}>Back</Button></Link>
          <Button onClick={generate} disabled={generating} className="flex-1">
            {generating ? 'Generating…' : mode === 'upload' ? 'Generate from material' : 'Generate quiz'}
          </Button>
        </div>

        {generating && (
          <div className="mt-6 text-center" aria-live="polite">
            <div className="inline-block w-8 h-8 border-2 border-line border-t-ink rounded-full animate-spin mb-3" />
            <p className="text-sm text-ink/60">{steps[step]}</p>
          </div>
        )}
      </Card>
      {toastEl}
    </div>
  );
}
