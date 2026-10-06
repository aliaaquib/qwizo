// Teachers / Students interactive product story — see DESIGN_SYSTEM.md §22.
// Alternating editorial cards with live, tappable product mockups.
// Card 1 (teachers) lives in Landing.tsx and is intentionally untouched.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Reveal, usePrefersReducedMotion, useRevealOnce } from '@/components/motion';

function Check({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#444348" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}

function CopyGlyph({ light = false }: { light?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={light ? '#FBFCFD' : '#444348'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function QrGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444348" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM21 14v.01M14 21v.01M18 18h3v3h-3z" />
    </svg>
  );
}

function ClockGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444348" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" opacity="0.55">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/* ---------------- Stage label ---------------- */

export function StageLabel({ n, stage }: { n: string; stage: string }) {
  return (
    <Reveal>
      <div className="flex items-center gap-4 mb-10 md:mb-12">
        <span className="inline-flex w-10 h-10 rounded-full bg-lime items-center justify-center text-[15px] font-semibold shrink-0">
          {n}
        </span>
        <span className="text-[13px] font-medium tracking-[0.2em] uppercase">{stage}</span>
        <span className="h-px flex-1 bg-ink/10" aria-hidden="true" />
      </div>
    </Reveal>
  );
}

/* ---------------- Shared card scaffolding ---------------- */

function StoryGrid({ flip = false, text, visual }: { flip?: boolean; text: ReactNode; visual: ReactNode }) {
  return (
    <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">
      <Reveal className={`order-1 ${flip ? 'md:order-2' : 'md:order-1'}`}>{text}</Reveal>
      <Reveal delay={120} className={`order-2 swap-visual ${flip ? 'md:order-1' : 'md:order-2'}`}>{visual}</Reveal>
    </div>
  );
}

function StoryText({
  eyebrow, headline, description, points, cta,
}: {
  eyebrow: string;
  headline: string;
  description: string;
  points: [string, string][];
  cta?: ReactNode;
}) {
  return (
    <div>
      <div className="text-[13px] font-medium tracking-[0.18em] text-ink/50 mb-4">{eyebrow}</div>
      <h3 className="h-section text-4xl md:text-5xl mb-5">{headline}</h3>
      <p className="text-lg text-ink/65 mb-8">{description}</p>
      <ul className="space-y-5 mb-9">
        {points.map(([title, desc]) => (
          <li key={title} className="flex items-start gap-3.5">
            <span className="mt-0.5 inline-flex w-6 h-6 rounded-full bg-lime items-center justify-center shrink-0" aria-hidden="true">
              <Check />
            </span>
            <span>
              <span className="block text-[16px] font-medium">{title}</span>
              <span className="block text-[15px] text-ink/60 mt-0.5">{desc}</span>
            </span>
          </li>
        ))}
      </ul>
      {cta}
    </div>
  );
}

function CtaLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="link-arrow group text-[16px]">
      {label} <span className="btn-arrow">→</span>
    </Link>
  );
}

function RadioRow({
  label, selected, onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`interact w-full flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left ${
        selected ? 'border-lime bg-lime/15' : 'border-line hover:border-ink/30 bg-paper'
      }`}
    >
      <span
        className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center shrink-0 ${
          selected ? 'bg-lime border-lime' : 'border-ink/25'
        }`}
        aria-hidden="true"
      >
        {selected && <Check size={10} />}
      </span>
      <span className="text-[14px]">{label}</span>
    </button>
  );
}

/* ---------------- Teacher Card 2 — Editor ---------------- */

type EditorQ = { q: string; options: string[]; marks: number; difficulty: string };

const EDITOR_QS: EditorQ[] = [
  { q: 'What is photosynthesis?', options: ['Process of making food', 'Process of respiration', 'Process of digestion', 'Process of reproduction'], marks: 1, difficulty: 'Medium' },
  { q: 'Where does photosynthesis occur?', options: ['In the chloroplast', 'In the mitochondria', 'In the nucleus', 'In the cell wall'], marks: 1, difficulty: 'Easy' },
  { q: 'What does chlorophyll do?', options: ['Absorbs light energy', 'Stores water', 'Transports nutrients', 'Protects the cell'], marks: 2, difficulty: 'Medium' },
  { q: 'Which gas is absorbed?', options: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Hydrogen'], marks: 1, difficulty: 'Easy' },
];

function EditorVisual() {
  const [list, setList] = useState<EditorQ[]>(EDITOR_QS);
  const [qi, setQi] = useState(0);
  const [correct, setCorrect] = useState<number[]>(() => EDITOR_QS.map(() => 0));
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const pick = (oi: number) => {
    setCorrect(prev => { const next = [...prev]; next[qi] = oi; return next; });
    setSaved(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaved(false), 1600);
  };
  const addQuestion = () => {
    const q: EditorQ = { q: 'New question', options: ['Option A', 'Option B', 'Option C', 'Option D'], marks: 1, difficulty: 'Medium' };
    setList(prev => [...prev, q]);
    setCorrect(prev => [...prev, 0]);
    setQi(list.length);
  };
  const cur = list[qi];

  return (
    <div className="bg-paper border border-line rounded-3xl shadow-soft p-5 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[13px] text-ink/50">Biology</div>
          <div className="font-medium text-[17px]">Photosynthesis</div>
        </div>
        <span
          className={`interact inline-flex items-center gap-1.5 text-[13px] font-medium text-ink/60 ${saved ? 'opacity-100' : 'opacity-0'}`}
          aria-live="polite"
        >
          <Check /> Saved
        </span>
      </div>
      <div className="grid sm:grid-cols-[148px_1fr] gap-4">
        <div className="flex sm:flex-col gap-2 overflow-x-auto pb-1 sm:pb-0" role="tablist" aria-label="Questions">
          {list.map((item, i) => (
            <button
              key={`${item.q}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === qi}
              onClick={() => setQi(i)}
              className={`interact text-left shrink-0 rounded-xl border px-3 py-2.5 ${
                i === qi ? 'bg-lime/40 border-lime' : 'border-line hover:border-ink/30 bg-paper'
              }`}
            >
              <div className="text-[12px] font-semibold text-ink/50">Q{i + 1}</div>
              <div className="text-[13px] font-medium truncate max-w-[132px]">{item.q}</div>
            </button>
          ))}
        </div>
        <div>
          <div key={qi} className="role-swap border border-line rounded-2xl p-4 md:p-5 bg-paper">
            <div className="text-[12px] font-medium text-ink/50 mb-1">Question {qi + 1}</div>
            <div className="text-[16px] font-medium mb-4">{cur.q}</div>
            <div className="space-y-2 mb-4">
              {cur.options.map((opt, oi) => (
                <RadioRow key={opt} label={opt} selected={correct[qi] === oi} onSelect={() => pick(oi)} />
              ))}
            </div>
            <div className="flex gap-2">
              <span className="text-[12px] font-medium bg-neutral rounded-full px-3 py-1">Marks · {cur.marks}</span>
              <span className="text-[12px] font-medium bg-neutral rounded-full px-3 py-1">{cur.difficulty}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={addQuestion}
            className="interact mt-3 w-full rounded-xl border border-dashed border-ink/25 text-[14px] font-medium text-ink/60 hover:text-ink hover:border-ink/45 py-2.5"
          >
            + Add question
          </button>
        </div>
      </div>
    </div>
  );
}

export function TeacherEditCard() {
  return (
    <StoryGrid
      flip
      text={
        <StoryText
          eyebrow="QUIZ EDITOR"
          headline="Make every question yours."
          description="AI gives you the first draft. You decide what stays, what changes, and what your students actually see."
          points={[
            ['Edit without limits', 'Change question wording, answers, explanations, marks, and difficulty.'],
            ['Build the right quiz', 'Add, remove, duplicate, and reorder questions until the assessment fits your class.'],
            ['Stay in control', "Nothing reaches students until you've reviewed and approved it."],
          ]}
          cta={<CtaLink to="/signup" label="Open the editor" />}
        />
      }
      visual={<EditorVisual />}
    />
  );
}

/* ---------------- Teacher Card 3 — Share ---------------- */

function ShareCopyButton({ text, label, primary = false }: { text: string; label: string; primary?: boolean }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { /* still show feedback */ }
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={
        primary
          ? 'interact inline-flex items-center gap-2 bg-ink text-paper text-[14px] font-medium rounded-full px-5 py-2.5'
          : 'interact inline-flex items-center gap-2 border border-line bg-paper text-[14px] font-medium rounded-full px-4 py-2 hover:border-ink/35'
      }
    >
      <span className="swap-stack" aria-live="polite">
        <span className={`swap-face ${copied ? 'opacity-0' : 'opacity-100'}`}>
          <CopyGlyph light={primary} /> {label}
        </span>
        <span className={`swap-face ${copied ? 'opacity-100' : 'opacity-0'}`}>
          <Check /> Copied
        </span>
      </span>
    </button>
  );
}

function QRGrid() {
  const cells = useMemo(() => {
    let s = 42;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    return Array.from({ length: 144 }, () => rnd() > 0.52);
  }, []);
  return (
    <div className="role-swap mt-4">
      <div className="relative w-28 h-28 mx-auto">
        <div className="grid grid-cols-12 gap-[2px] w-full h-full" aria-hidden="true">
          {cells.map((on, i) => (
            <div key={i} className={`rounded-[1px] ${on ? 'bg-ink' : 'bg-ink/5'}`} />
          ))}
        </div>
        {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0'].map(pos => (
          <div key={pos} className={`absolute ${pos} w-7 h-7 bg-paper border-2 border-ink rounded-[4px] p-1`} aria-hidden="true">
            <div className="w-full h-full bg-ink rounded-[2px]" />
          </div>
        ))}
      </div>
      <div className="text-[12px] text-ink/50 mt-2">Scan to join</div>
    </div>
  );
}

function ShareVisual() {
  const [showQR, setShowQR] = useState(false);
  const code = 'BKCJ-8575';
  return (
    <div className="bg-paper border border-line rounded-3xl shadow-soft p-6 md:p-8 text-center">
      <div className="inline-flex items-center gap-2 bg-lime/40 rounded-full px-4 py-1.5 text-[14px] font-medium">
        <Check /> Quiz published
      </div>
      <div className="mt-5 text-[12px] font-medium tracking-[0.2em] text-ink/45">BIOLOGY</div>
      <div className="display text-[28px]">Photosynthesis</div>
      <div className="mt-6 text-[12px] font-medium tracking-[0.2em] text-ink/45">JOIN CODE</div>
      <div className="font-mono text-[34px] tracking-[0.18em] my-1">{code}</div>
      <div className="flex items-center justify-center gap-2 flex-wrap mt-3">
        <ShareCopyButton text={code} label="Copy code" primary />
        <ShareCopyButton text={`https://qwizo.aaquibali.com/join/${code}`} label="Copy link" />
        <button
          type="button"
          onClick={() => setShowQR(v => !v)}
          aria-expanded={showQR}
          className="interact inline-flex items-center gap-2 border border-line bg-paper text-[14px] font-medium rounded-full px-4 py-2 hover:border-ink/35"
        >
          <QrGlyph /> QR
        </button>
      </div>
      {showQR && <QRGrid />}
      <div className="mt-6 pt-5 border-t border-line flex items-center justify-center gap-3">
        <div className="flex -space-x-2" aria-hidden="true">
          {['AK', 'DM', 'SZ'].map(init => (
            <span key={init} className="w-7 h-7 rounded-full bg-sky border-2 border-paper inline-flex items-center justify-center text-[10px] font-semibold">
              {init}
            </span>
          ))}
          <span className="w-7 h-7 rounded-full bg-lime border-2 border-paper inline-flex items-center justify-center text-[10px] font-semibold">
            +25
          </span>
        </div>
        <div className="text-[14px] text-ink/60"><span className="font-semibold text-ink">28</span> students joined</div>
      </div>
    </div>
  );
}

export function TeacherShareCard() {
  return (
    <StoryGrid
      text={
        <StoryText
          eyebrow="READY FOR CLASS"
          headline="One quiz. One code. Everyone joins."
          description="Publish your quiz and give students a simple way to join. No complicated setup. Just share the code."
          points={[
            ["Publish when you're ready", 'Review the entire quiz before sending it to students.'],
            ['Share anywhere', 'Copy a link, share a code, or display a QR code.'],
            ['Get everyone started', 'Students enter the code and begin.'],
          ]}
          cta={<CtaLink to="/signup" label="See the sharing flow" />}
        />
      }
      visual={<ShareVisual />}
    />
  );
}

/* ---------------- Teacher Card 4 — Results ---------------- */

const RESULT_ROWS = [
  { q: 'Q1', pct: 96 },
  { q: 'Q2', pct: 81 },
  { q: 'Q3', pct: 63 },
  { q: 'Q4', pct: 89 },
];

function AnimatedBar({ pct, delay }: { pct: number; delay: number }) {
  const { ref, visible } = useRevealOnce<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();
  const on = visible || reduced;
  return (
    <div ref={ref} className="h-2.5 rounded-full bg-neutral overflow-hidden">
      <div
        className="h-full rounded-full bg-lime origin-left ease-qwizo"
        style={{
          width: `${pct}%`,
          transform: on ? 'scaleX(1)' : 'scaleX(0)',
          transitionProperty: 'transform',
          transitionDuration: '700ms',
          transitionDelay: `${delay}ms`,
        }}
      />
    </div>
  );
}

function TeacherResultsVisual() {
  return (
    <div className="bg-paper border border-line rounded-3xl shadow-soft p-6 md:p-8">
      <div className="text-[13px] text-ink/50">Biology — Photosynthesis</div>
      <div className="text-[14px] font-medium mb-5">28 students completed</div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-neutral/60 rounded-2xl p-4">
          <div className="text-[12px] text-ink/50 mb-1">Average score</div>
          <div className="display text-3xl">82%</div>
        </div>
        <div className="bg-neutral/60 rounded-2xl p-4">
          <div className="text-[12px] text-ink/50 mb-1">Completion</div>
          <div className="display text-3xl">94%</div>
        </div>
      </div>
      <div className="text-[13px] font-medium mb-3">Question accuracy</div>
      <div className="space-y-3 mb-5">
        {RESULT_ROWS.map((r, i) => (
          <div key={r.q} className="grid grid-cols-[28px_1fr_44px] items-center gap-3">
            <span className="text-[13px] font-medium text-ink/60">{r.q}</span>
            <AnimatedBar pct={r.pct} delay={i * 90} />
            <span className="text-[13px] font-medium text-right">{r.pct}%</span>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-line px-4 py-3 text-[14px]">
        <span className="text-ink/55">Hardest question</span> <span className="font-medium">Q3 — 63%</span>
      </div>
    </div>
  );
}

export function TeacherResultsCard() {
  return (
    <StoryGrid
      flip
      text={
        <StoryText
          eyebrow="ASSESSMENT RESULTS"
          headline="Know what your students know."
          description="See how your class performed, which questions caused trouble, and where students need more support."
          points={[
            ['See the whole class', 'Average score, completion and performance at a glance.'],
            ['Find the difficult questions', "See which questions students got right — and which they didn't."],
            ['Go deeper when you need to', 'Open individual student results for a closer look.'],
          ]}
          cta={<CtaLink to="/signup" label="View results" />}
        />
      }
      visual={<TeacherResultsVisual />}
    />
  );
}

/* ---------------- Student Card 1 — Join ---------------- */

export function StudentJoinCard() {
  const [code, setCode] = useState('BKCJ-8575');
  const [name, setName] = useState('Aaquib');
  const [st, setSt] = useState<'idle' | 'joining' | 'joined'>('idle');
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const doJoin = () => {
    if (st !== 'idle') return;
    setSt('joining');
    timer.current = window.setTimeout(() => setSt('joined'), 900);
  };

  return (
    <StoryGrid
      text={
        <StoryText
          eyebrow="JOIN YOUR CLASS"
          headline="Enter the code. Get started."
          description="Your teacher gives you a short code. Enter it, add your name, and you're ready to go."
          points={[
            ['No complicated setup', 'Just enter the quiz code.'],
            ['Join in seconds', 'Get straight into the assessment.'],
            ['Works on your phone', 'No special software required.'],
          ]}
          cta={
            <button type="button" onClick={doJoin} className="link-arrow group text-[16px]">
              Join a quiz <span className="btn-arrow">→</span>
            </button>
          }
        />
      }
      visual={
        <div className="bg-paper border border-line rounded-3xl shadow-soft p-6 md:p-8 max-w-sm mx-auto w-full">
          <div className="display text-2xl mb-1">Join a quiz</div>
          <p className="text-[14px] text-ink/55 mb-6">Enter the code from your teacher.</p>
          <label htmlFor="demo-code" className="block text-[13px] font-medium mb-1.5">Enter your code</label>
          <input
            id="demo-code"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            maxLength={9}
            autoComplete="off"
            className="input-qwizo w-full font-mono tracking-[0.2em] text-center text-lg mb-4"
          />
          <label htmlFor="demo-name" className="block text-[13px] font-medium mb-1.5">Your name</label>
          <input
            id="demo-name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={24}
            autoComplete="off"
            placeholder="Your name"
            className="input-qwizo w-full text-center mb-6"
          />
          <button
            type="button"
            onClick={doJoin}
            disabled={st !== 'idle'}
            className={`interact w-full rounded-full py-3 text-[15px] font-medium ${
              st === 'joined' ? 'bg-lime text-ink' : 'bg-ink text-paper'
            } ${st !== 'idle' && st !== 'joined' ? 'opacity-70' : ''}`}
          >
            <span className="swap-stack" aria-live="polite">
              <span className={`swap-face ${st === 'idle' ? 'opacity-100' : 'opacity-0'}`}>Join quiz →</span>
              <span className={`swap-face ${st === 'joining' ? 'opacity-100' : 'opacity-0'}`}>Joining…</span>
              <span className={`swap-face ${st === 'joined' ? 'opacity-100' : 'opacity-0'}`}>
                <Check /> Joined
              </span>
            </span>
          </button>
          {st === 'joined' && (
            <p className="role-swap text-[13px] text-ink/55 mt-3 text-center">
              Welcome{name.trim() ? `, ${name.trim()}` : ''} — starting shortly.
            </p>
          )}
        </div>
      }
    />
  );
}

/* ---------------- Student Card 2 — Answer ---------------- */

const STUDENT_QS = [
  { q: 'What process do plants use to convert light energy?', options: ['Respiration', 'Photosynthesis', 'Digestion', 'Fermentation'] },
  { q: 'Where does photosynthesis take place?', options: ['Mitochondria', 'Chloroplast', 'Nucleus', 'Ribosome'] },
  { q: 'Which gas do plants absorb?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'] },
];

export function StudentAnswerCard() {
  const [qi, setQi] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const next = () => { setSel(null); setQi(i => (i + 1) % STUDENT_QS.length); };
  const cur = STUDENT_QS[qi];

  return (
    <StoryGrid
      flip
      text={
        <StoryText
          eyebrow="TAKE THE QUIZ"
          headline="One question at a time. Stay focused."
          description="Qwizo keeps the experience simple so you can focus on answering instead of figuring out the interface."
          points={[
            ['Clear questions', 'One question at a time.'],
            ['Simple answers', 'Large, easy-to-select answer choices.'],
            ['Stay on track', 'Always know where you are in the quiz.'],
          ]}
        />
      }
      visual={
        <div className="bg-paper border border-line rounded-3xl shadow-soft p-6 md:p-8">
          <div className="text-[12px] font-medium tracking-[0.18em] text-ink/45 mb-1">BIOLOGY — PHOTOSYNTHESIS</div>
          <div className="text-[14px] font-medium mb-5">Question {qi + 1} of {STUDENT_QS.length}</div>
          <div key={qi} className="role-swap">
            <div className="text-[19px] font-medium mb-5">{cur.q}</div>
            <div className="space-y-2.5 mb-6">
              {cur.options.map((opt, oi) => (
                <RadioRow key={opt} label={opt} selected={sel === oi} onSelect={() => setSel(oi)} />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-ink/50 font-medium">{qi + 1} / {STUDENT_QS.length}</span>
            <button
              type="button"
              onClick={next}
              className="interact inline-flex items-center gap-2 bg-ink text-paper rounded-full px-5 py-2.5 text-[14px] font-medium"
            >
              Next question <span className="btn-arrow">→</span>
            </button>
          </div>
        </div>
      }
    />
  );
}

/* ---------------- Student Card 3 — Progress ---------------- */

function ProgressSegments() {
  const { ref, visible } = useRevealOnce<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();
  const on = visible || reduced;
  return (
    <div ref={ref} className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-2 flex-1 rounded-full bg-neutral overflow-hidden">
          {i < 6 && (
            <div
              className="h-full w-full bg-lime rounded-full origin-left ease-qwizo"
              style={{
                transform: on ? 'scaleX(1)' : 'scaleX(0)',
                transitionProperty: 'transform',
                transitionDuration: '400ms',
                transitionDelay: `${i * 70}ms`,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function StudentProgressCard() {
  const options = ['Absorbing light energy', 'Storing water', 'Producing seeds', 'Growing roots'];
  return (
    <StoryGrid
      text={
        <StoryText
          eyebrow="STAY ON TRACK"
          headline="See your progress as you go."
          description="Know how many questions you've answered and how much is left without losing focus."
          points={[
            ['Clear progress', 'Always know your place in the quiz.'],
            ["Timer when your teacher enables it", 'Stay aware of the time without unnecessary distractions.'],
            ['Automatic progress', 'Your answers move you forward smoothly.'],
          ]}
        />
      }
      visual={
        <div className="bg-paper border border-line rounded-3xl shadow-soft p-6 md:p-8">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[14px] font-medium">Question 6 of 10</div>
            <div className="inline-flex items-center gap-1.5 text-[13px] text-ink/60">
              <ClockGlyph /> 06:42 remaining
            </div>
          </div>
          <ProgressSegments />
          <div className="text-[17px] font-medium mt-6 mb-4">What is the main function of chlorophyll?</div>
          <div className="space-y-2.5">
            {options.map((opt, oi) => (
              <RadioRow key={opt} label={opt} selected={oi === 0} onSelect={() => {}} />
            ))}
          </div>
        </div>
      }
    />
  );
}

/* ---------------- Student Card 4 — Results ---------------- */

function CountUp({ to }: { to: number }) {
  const { ref, visible } = useRevealOnce<HTMLSpanElement>();
  const reduced = usePrefersReducedMotion();
  const [val, setVal] = useState(reduced ? to : 0);
  useEffect(() => {
    if (!visible || reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, reduced, to]);
  return <span ref={ref}>{val}</span>;
}

const REVIEW_ROWS = [
  { q: 'What is photosynthesis?', yours: 'Process of making food', ok: true },
  { q: 'Where does it occur?', yours: 'In the chloroplast', ok: true },
  { q: 'Which gas is absorbed?', yours: 'Oxygen', ok: false },
];

export function StudentResultCard() {
  const [open, setOpen] = useState(false);
  return (
    <StoryGrid
      flip
      text={
        <StoryText
          eyebrow="QUIZ COMPLETE"
          headline="Finish strong. See how you did."
          description="Get your result when the quiz is complete and understand how you performed."
          points={[
            ['See your score', 'Know how many questions you got right.'],
            ['Review your answers', 'Where the teacher allows it, review what you answered.'],
            ['Know what to improve', 'Use your results to understand what to work on next.'],
          ]}
        />
      }
      visual={
        <div className="bg-paper border border-line rounded-3xl shadow-soft p-6 md:p-8 text-center">
          <div className="text-[13px] font-medium tracking-[0.18em] text-ink/45 mb-2">QUIZ COMPLETE</div>
          <div className="display text-[64px] leading-none">
            <CountUp to={87} />%
          </div>
          <div className="text-[17px] font-medium mt-2">Great work!</div>
          <div className="text-[14px] text-ink/55 mt-1 mb-5">9 / 10 correct · Time 08:32</div>
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            aria-expanded={open}
            className="interact border border-line bg-paper text-[14px] font-medium rounded-full px-5 py-2.5 hover:border-ink/35"
          >
            {open ? 'Hide review' : 'Review answers'}
          </button>
          {open && (
            <div className="role-swap mt-4 text-left space-y-2">
              {REVIEW_ROWS.map(r => (
                <div key={r.q} className="flex items-start gap-3 rounded-xl border border-line px-3.5 py-3">
                  <span
                    className={`mt-0.5 inline-flex w-5 h-5 rounded-full items-center justify-center shrink-0 ${r.ok ? 'bg-lime' : 'bg-neutral'}`}
                    aria-hidden="true"
                  >
                    {r.ok ? (
                      <Check size={10} />
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#444348" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    )}
                  </span>
                  <span>
                    <span className="block text-[13px] font-medium">{r.q}</span>
                    <span className="block text-[13px] text-ink/55">{r.yours}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      }
    />
  );
}
