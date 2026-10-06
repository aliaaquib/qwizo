import { Link, Navigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { QwizoLogo } from '@/components/QwizoLogo';
import { BrandSpot } from '@/components/BrandSpot';
import { WhyVideo } from '@/components/WhyVideo';
import { Enter, Reveal, usePrefersReducedMotion } from '@/components/motion';
import { useAuth } from '@/features/auth/AuthContext';
import {
  StageLabel,
  TeacherEditCard,
  TeacherShareCard,
  TeacherResultsCard,
  StudentJoinCard,
  StudentAnswerCard,
  StudentProgressCard,
  StudentResultCard,
} from '@/components/product-story';

// Qwizo homepage — follows DESIGN_SYSTEM.md permanently.
// 8-section structure. Product UI is the visual, never generic illustrations.
// No fake metrics, no invented stats.

const CONTAINER = 'max-w-[1280px] mx-auto px-6 md:px-10';

/* ---------------- 00 · Navigation ---------------- */

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showStory(audience: 'teachers' | 'students', id: string) {
  window.dispatchEvent(new CustomEvent('qwizo:show-story', { detail: { audience } }));
  window.setTimeout(() => scrollToId(id), 450);
}

function NavDropdown({ label, items }: { label: string; items: { label: string; onSelect: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);
  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="interact hover:text-ink inline-flex items-center gap-1 px-2 py-1.5 rounded-full hover:bg-ink/5"
      >
        {label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          className={`interact ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="dropdown-panel nav-menu left-0" style={{ minWidth: 210 }}>
          {items.map(it => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); it.onSelect(); }}
              className="dropdown-item"
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Nav() {
  return (
    <div className="absolute top-0 inset-x-0 z-20">
      <div className={`${CONTAINER} pt-5 flex justify-center`}>
        <Enter y={-14} duration={600}>
        <nav className="bg-paper/95 backdrop-blur border border-line rounded-full shadow-soft pl-5 pr-2 h-14 flex items-center gap-4">
          <Link to="/" aria-label="Qwizo home">
            <QwizoLogo badge />
          </Link>
          <div className="hidden lg:flex items-center gap-0.5 text-[15px] text-ink/75">
            <NavDropdown label="For educators" items={[
              { label: 'AI quiz creation', onSelect: () => showStory('teachers', 'story-create') },
              { label: 'Quiz editor', onSelect: () => showStory('teachers', 'story-edit') },
              { label: 'Share with class', onSelect: () => showStory('teachers', 'story-share') },
              { label: 'Class results', onSelect: () => showStory('teachers', 'story-results') },
            ]} />
            <a href="#plans" className="interact hover:text-ink px-2 py-1.5 rounded-full hover:bg-ink/5">Plans</a>
            <NavDropdown label="Library" items={[
              { label: 'Question types', onSelect: () => scrollToId('question-types') },
              { label: 'AI generator', onSelect: () => scrollToId('features') },
            ]} />
          </div>
          <div className="flex items-center gap-1">
            <span className="w-px h-5 bg-line ml-6 mr-3 hidden lg:block" aria-hidden="true" />
            <Link
              to="/join"
              className="interact hidden lg:block rounded-full bg-ink/5 hover:bg-ink/10 px-4 py-2 text-[15px] font-medium text-ink/75 hover:text-ink"
            >
              Enter code
            </Link>
            <Link to="/login" className="interact text-[15px] font-medium text-ink/75 hover:text-ink px-3 py-1.5">
              Login
            </Link>
            <Link to="/signup">
              <span className="btn-interactive group inline-flex items-center text-[15px] font-medium bg-lime text-ink rounded-full px-5 py-2.5 hover:brightness-95">
                Signup
              </span>
            </Link>
          </div>
        </nav>
        </Enter>
      </div>
    </div>
  );
}

/* ---------------- 01 · Hero ---------------- */

// One lime chip in the middle of the headline, cycling through quiz-related
// icons one by one with a pop-in animation.
const HEADLINE_ICONS = [
  {
    label: 'Correct answer',
    glyph: <path d="M4 12.5l5 5L20 6.5" />,
  },
  {
    label: 'Any question',
    glyph: (
      <>
        <path d="M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.2-1.5 2.4" />
        <circle cx="12" cy="17.5" r="0.8" fill="#444348" stroke="none" />
      </>
    ),
  },
  {
    label: 'Edit everything',
    glyph: (
      <>
        <path d="M4 20l1-4L16.5 4.5a2.12 2.12 0 0 1 3 3L8 19l-4 1z" />
        <path d="M14.5 6.5l3 3" />
      </>
    ),
  },
  {
    label: 'AI assist',
    glyph: <path d="M12 3l1.9 5.6 5.6 1.4-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3z" />,
  },
];

function CyclingHeadlineChip() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setIndex(i => (i + 1) % HEADLINE_ICONS.length),
      2200
    );
    return () => clearInterval(t);
  }, []);

  const icon = HEADLINE_ICONS[index];
  return (
    <span
      role="img"
      aria-label={icon.label}
      className="inline-flex w-[0.64em] h-[0.64em] rounded-[0.2em] bg-lime items-center justify-center -rotate-[8deg] mx-[0.08em] align-[-0.06em]"
    >
      <svg
        key={index}
        width="58%"
        height="58%"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#444348"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="chip-icon-pop"
      >
        {icon.glyph}
      </svg>
    </span>
  );
}

function Hero() {
  return (
    <section
      id="demo"
      className="pt-28 md:pt-32 pb-20 md:pb-28 relative overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, #edf4fe 0%, #dfeafb 55%, #d6e4fa 100%)',
      }}
    >
      <div className={CONTAINER}>
        <div className="text-center max-w-5xl mx-auto">
          <Enter delay={100} y={12}>
            <div className="inline-block text-[13px] font-medium text-ink bg-lime rounded-full px-4 py-1.5 mb-7 shadow-sm">
              Built for teachers
            </div>
          </Enter>
          <Enter delay={200} y={20}>
            <h1 className="display text-5xl md:text-7xl mb-6 text-ink leading-[1.08]">
              Create better quizzes.
              <br />
              <span className="md:whitespace-nowrap">
                in minutes, <CyclingHeadlineChip /> not hours.
              </span>
            </h1>
          </Enter>
          <Enter delay={300} y={16}>
            <p className="text-lg md:text-xl text-ink/60 max-w-xl mx-auto mb-9">
              Create, edit and share high-quality quizzes with AI — while keeping
              complete control over every question.
            </p>
          </Enter>
          <Enter delay={400} y={14}>
            <div className="flex justify-center">
              <Link to="/signup">
                <Button size="lg">Start creating free</Button>
              </Link>
            </div>
          </Enter>
        </div>
        <div className="max-w-3xl mx-auto mt-14 md:mt-16">
          <Enter delay={520} y={35} scaleFrom={0.98}>
            <BrandSpot />
          </Enter>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 03 · Problem ---------------- */

// Browser-window product mockup — mirrors the reference layout:
// blue panel, centered copy, white browser frame with traffic lights,
// product UI inside, lime "Play Demo" pill scrolling to the live demo above.
function Problem() {
  const points = [
    'AI drafts the questions — you approve every one',
    'Five question types, graded automatically',
    'Share with a code, a link, or a QR — no student accounts',
  ];
  return (
    <section className="problem-flow py-16 md:py-24">
      <div className={CONTAINER}>
          <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
            <Reveal>
            <div>
              <div className="text-[13px] font-medium tracking-[0.18em] text-ink/50 mb-5">
                WHY QWIZO
              </div>
              <h2 className="display text-4xl md:text-5xl mb-6">
                Creating a good quiz shouldn't take your entire evening.
              </h2>
              <p className="text-lg text-ink/60 mb-8">
                Writing questions, balancing difficulty, formatting answer
                keys — it adds up. Qwizo takes the repetitive work off your
                plate so you can focus on knowing what your students need.
              </p>
              <ul className="space-y-3.5">
                {points.map(p => (
                  <li key={p} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 inline-flex w-6 h-6 rounded-full bg-lime items-center justify-center shrink-0"
                      aria-hidden="true"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444348" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12.5l5 5L20 6.5" />
                      </svg>
                    </span>
                    <span className="text-[15px] font-medium">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            </Reveal>
            <Reveal delay={120}>
            <div className="bg-paper rounded-2xl shadow-soft p-2.5 md:p-3">
              <WhyVideo />
            </div>
            </Reveal>
          </div>
      </div>
    </section>
  );
}

/* ---------------- 03b · Question types ---------------- */

// Mirrors the reference: centered headline, 3×2 card grid, one dark featured
// card, dark pill CTA. Content is Qwizo's five real question types + AI draft.
function TypeIcon({ d, dark = false }: { d: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={`inline-flex w-11 h-11 rounded-[10px] items-center justify-center ${
        dark ? 'bg-paper' : 'bg-lime'
      }`}
      aria-hidden="true"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#444348" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {d}
      </svg>
    </span>
  );
}

const TYPE_ICONS = {
  mcq: (
    <>
      <circle cx="6" cy="6" r="2.2" />
      <path d="M12 6h8" />
      <circle cx="6" cy="12" r="2.2" />
      <path d="M12 12h8" />
      <circle cx="6" cy="18" r="2.2" />
      <path d="M12 18h8" />
    </>
  ),
  tf: (
    <>
      <path d="M4 12.5l5 5L20 6.5" />
    </>
  ),
  short: (
    <>
      <path d="M4 6h16" />
      <path d="M4 11h16" />
      <path d="M4 16h10" />
    </>
  ),
  blank: (
    <>
      <path d="M4 7h7" />
      <path d="M15 7h5" />
      <path d="M4 7v0" />
      <path d="M4 17h16" strokeDasharray="0" />
      <path d="M7 12h10" strokeWidth="2.4" />
    </>
  ),
  match: (
    <>
      <circle cx="6" cy="6" r="1.8" />
      <circle cx="6" cy="18" r="1.8" />
      <circle cx="18" cy="6" r="1.8" />
      <circle cx="18" cy="18" r="1.8" />
      <path d="M7.5 7.5l9 9" />
      <path d="M7.5 16.5l9-9" />
    </>
  ),
  ai: (
    <>
      <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3z" />
      <path d="M18.5 15.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z" />
    </>
  ),
};

function QuestionTypes() {
  const types = [
    { icon: 'mcq', title: 'Multiple choice', desc: 'Classic A–D options with single or multiple correct answers.' },
    { icon: 'tf', title: 'True / False', desc: 'Fast knowledge checks, warm-ups and exit tickets.' },
    { icon: 'short', title: 'Short answer', desc: 'Free-text responses graded against answers you accept.' },
    { icon: 'blank', title: 'Fill in the blank', desc: 'Students complete the sentence — every blank is checked.' },
    { icon: 'match', title: 'Matching', desc: 'Pair items across two columns: terms, dates, definitions.' },
  ] as const;
  return (
    <section id="question-types" className="py-16 md:py-24">
      <div className={CONTAINER}>
        <Reveal>
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-14">
          <h2 className="display text-4xl md:text-6xl mb-5">The right question for every moment</h2>
          <p className="text-lg text-ink/60">
            Five flexible question types, each graded automatically. Mix and
            match them in any quiz.
          </p>
        </div>
        </Reveal>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5">
          {types.map((t, i) => (
            <Reveal key={t.title} delay={i * 80} className="h-full">
            <div className="card-selectable bg-neutral border border-transparent rounded-2xl p-7 flex flex-col min-h-[270px] h-full">
              <TypeIcon d={TYPE_ICONS[t.icon]} />
              <div className="mt-auto pt-10">
                <h3 className="text-[22px] font-medium mb-2">{t.title}</h3>
                <p className="text-[15px] text-ink/60 leading-relaxed">{t.desc}</p>
              </div>
            </div>
            </Reveal>
          ))}
          <Reveal delay={400} className="h-full">
          <div className="card-selectable bg-neutral border border-transparent rounded-2xl p-7 flex flex-col min-h-[270px] h-full">
            <TypeIcon d={TYPE_ICONS.ai} />
            <div className="mt-auto pt-10">
              <h3 className="text-[22px] font-medium mb-2">AI draft</h3>
              <p className="text-[15px] text-ink/60 leading-relaxed">
                Describe your topic and get a full set of questions in seconds.
                You review everything before it reaches students.
              </p>
            </div>
          </div>
          </Reveal>
        </div>
        <Reveal>
        <div className="text-center mt-10">
          <Link to="/signup">
            <span className="btn-interactive group inline-flex items-center bg-ink text-white rounded-full px-7 py-3 text-[15px] font-medium hover:bg-[#55555a]">
              Try them free
            </span>
          </Link>
        </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- 04 · AI quiz creation ---------------- */

function AiCreation() {
  const [role, setRole] = useState<'teachers' | 'students'>('teachers');
  const [shown, setShown] = useState<'teachers' | 'students'>('teachers');
  const [leaving, setLeaving] = useState(false);
  const switchTimer = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  useEffect(() => () => { if (switchTimer.current) window.clearTimeout(switchTimer.current); }, []);
  const choose = (r: 'teachers' | 'students') => {
    if (r === role) return;
    setRole(r);
    if (reducedMotion) { setShown(r); return; }
    if (switchTimer.current) window.clearTimeout(switchTimer.current);
    setLeaving(true);
    switchTimer.current = window.setTimeout(() => { setShown(r); setLeaving(false); }, 220);
  };
  const chooseRef = useRef(choose);
  chooseRef.current = choose;
  useEffect(() => {
    const onShowStory = (e: Event) => {
      const audience = (e as CustomEvent).detail?.audience;
      if (audience !== 'teachers' && audience !== 'students') return;
      chooseRef.current(audience);
    };
    window.addEventListener('qwizo:show-story', onShowStory);
    return () => window.removeEventListener('qwizo:show-story', onShowStory);
  }, []);
  const points = [
    'Turn a topic, a handout, or a rough idea into a full set of questions — no more blank page.',
    'Tune it to your class: difficulty, question types and marks stay in your hands.',
    'Nothing reaches students until you have reviewed and approved every question.',
  ];
  const ready = ['Solve: 2x = 10', 'Graph: y = 3x + 1', 'Solve: 3x + 5 = 20'];
  return (
    <section id="features" className="blend-paper-mist py-28">
      <div className={CONTAINER}>
        <Reveal>
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <h2 className="display text-5xl md:text-7xl mb-10">
            Let&apos;s find a way
          </h2>
          <div
            role="tablist"
            aria-label="Choose your role"
            className="relative inline-flex bg-paper border border-line shadow-soft rounded-full p-1.5"
          >
            <span
              aria-hidden="true"
              className="toggle-pill absolute top-1.5 bottom-1.5 left-1.5 w-36 md:w-44 rounded-full bg-lime"
              style={{ transform: role === 'students' ? 'translateX(100%)' : 'translateX(0)' }}
            />
            {(['teachers', 'students'] as const).map(r => (
              <button
                key={r}
                role="tab"
                aria-selected={role === r}
                onClick={() => choose(r)}
                className={`interact relative z-10 w-36 md:w-44 py-3.5 rounded-full text-[16px] font-medium capitalize ${
                  role === r ? 'text-ink' : 'text-ink/55 hover:text-ink'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div key={shown} className="role-swap mt-10" role="tabpanel">
            {shown === 'teachers' ? (
              <>
                <p className="text-lg text-ink/65 max-w-xl mx-auto">
                  Create, share and grade quizzes — with AI drafting the
                  questions and you approving every one.
                </p>
              </>
            ) : (
              <>
                <p className="text-lg text-ink/65 max-w-xl mx-auto mb-8">
                  Got a quiz code from your teacher? You&apos;re one step away —
                  no account, no sign-up, just the quiz.
                </p>
                <a href="#how" className="link-arrow group text-ink text-[16px]">
                  See how it works <span className="btn-arrow">→</span>
                </a>
              </>
            )}
          </div>
        </div>
        </Reveal>
        <div key={shown} className={leaving ? 'audience-leaving' : 'audience-enter'}>
        {shown === 'teachers' ? (
          <>
          <div id="story-create">
            <StageLabel n="01" stage="Create" />
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <Reveal>
          <div>
            <div className="text-[13px] font-medium tracking-[0.18em] text-ink/50 mb-4">
              AI QUIZ CREATION
            </div>
            <h2 className="h-section text-4xl md:text-5xl mb-5">
              You describe it. AI drafts it. You decide.
            </h2>
            <p className="text-lg text-ink/65 mb-9">
              Skip the blank page. Turn a topic into a complete quiz draft —
              with you in charge of every question that reaches your students.
            </p>
            <ul className="space-y-5 mb-10">
              {points.map(pt => (
                <li key={pt} className="flex items-start gap-3.5">
                  <span
                    className="mt-1 inline-flex w-6 h-6 rounded-full bg-lime items-center justify-center shrink-0"
                    aria-hidden="true"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444348" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12.5l5 5L20 6.5" />
                    </svg>
                  </span>
                  <span className="text-[17px] leading-relaxed text-ink/80">{pt}</span>
                </li>
              ))}
            </ul>
            <Link to="/signup">
              <Button>Try the generator <span className="btn-arrow">→</span></Button>
            </Link>
          </div>
          </Reveal>
          <Reveal delay={120}>
          <div className="relative rounded-[32px] bg-sky/60 p-6 md:p-8 md:min-h-[600px] overflow-hidden">
            {/* Generate form */}
            <div className="bg-paper rounded-2xl border border-line shadow-soft p-5 md:absolute md:top-10 md:left-10 md:w-72 mb-5 md:mb-0">
              <div className="text-[14px] font-medium mb-3">Describe your quiz</div>
              <div className="bg-neutral rounded-control px-4 py-2.5 mb-2.5">
                <div className="text-[11px] text-ink/45">Topic</div>
                <div className="text-[14px] font-medium">Linear equations</div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-neutral rounded-control px-3 py-2">
                  <div className="text-[11px] text-ink/45">Level</div>
                  <div className="text-[13px] font-medium">Year 8</div>
                </div>
                <div className="bg-neutral rounded-control px-3 py-2">
                  <div className="text-[11px] text-ink/45">Questions</div>
                  <div className="text-[13px] font-medium">15</div>
                </div>
              </div>
              <div className="bg-ink text-white text-center text-[14px] font-medium rounded-full py-2.5">
                Generate quiz
              </div>
            </div>
            {/* Share code */}
            <div className="bg-paper rounded-2xl border border-line shadow-soft px-5 py-4 md:absolute md:top-14 md:right-10 mb-5 md:mb-0">
              <div className="text-[12px] text-ink/50 mb-1">Share code</div>
              <div className="font-mono text-lg tracking-widest">BKCJ-8575</div>
            </div>
            {/* Generated questions */}
            <div className="bg-paper rounded-2xl border border-line shadow-soft p-5 md:absolute md:bottom-12 md:right-10 md:w-80 md:z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[14px] font-medium">Linear Equations</div>
                <span className="inline-flex items-center gap-1 text-[12px] font-medium bg-lime rounded-full px-2.5 py-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#444348" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 12.5l5 5L20 6.5" />
                  </svg>
                  3 ready
                </span>
              </div>
              <div className="space-y-2">
                {ready.map((q, i) => (
                  <div key={q} className="flex items-center gap-2.5 border border-line rounded-control px-3 py-2">
                    <span className="text-[11px] text-ink/45 font-medium">Q{i + 1}</span>
                    <span className="text-[13px]">{q}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[13px] text-ink/50 text-center md:absolute md:bottom-5 md:inset-x-0">
              Free for teachers · You review everything before publishing
            </p>
          </div>
          </Reveal>
        </div>
          </div>
          <div className="mt-20 md:mt-28" id="story-edit">
            <StageLabel n="02" stage="Edit" />
            <TeacherEditCard />
          </div>
          <div className="mt-20 md:mt-28" id="story-share">
            <StageLabel n="03" stage="Share" />
            <TeacherShareCard />
          </div>
          <div className="mt-20 md:mt-28" id="story-results">
            <StageLabel n="04" stage="Results" />
            <TeacherResultsCard />
          </div>
          </>
        ) : (
          <>
          <div id="story-join">
            <StageLabel n="01" stage="Join" />
            <StudentJoinCard />
          </div>
          <div className="mt-20 md:mt-28">
            <StageLabel n="02" stage="Answer" />
            <StudentAnswerCard />
          </div>
          <div className="mt-20 md:mt-28">
            <StageLabel n="03" stage="Progress" />
            <StudentProgressCard />
          </div>
          <div className="mt-20 md:mt-28">
            <StageLabel n="04" stage="Results" />
            <StudentResultCard />
          </div>
          </>
        )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 07 · Ecosystem ---------------- */

function EcoCard({
  large = false,
  tint,
  hover,
  lead,
  link,
  visual,
  children,
}: {
  large?: boolean;
  tint: string;
  hover: string;
  lead: string;
  link: { label: string; href: string };
  visual: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Reveal className={`h-full ${large ? 'md:col-span-2' : ''}`}>
      <div className={`h-full border border-line rounded-[28px] p-7 md:p-10 flex flex-col transition-colors duration-300 ease-qwizo ${tint} ${hover}`}>
        <p className="text-[17px] md:text-[19px] leading-relaxed text-ink/70 mb-4">
          <strong className="font-semibold text-ink">{lead}</strong> {children}
        </p>
        <a href={link.href} className="link-arrow group text-[16px] font-medium mb-10">
          {link.label} <span className="btn-arrow">→</span>
        </a>
        <div className="mt-auto">{visual}</div>
      </div>
    </Reveal>
  );
}

const ECO_CLASSES = [
  { name: 'Year 8 · Biology', meta: '28 students · 82% avg' },
  { name: 'Year 9 · Algebra', meta: '31 students · 76% avg' },
  { name: 'Year 7 · History', meta: '26 students · 88% avg' },
];

const ECO_BANDS = [
  { label: 'Needs work', pct: 18, color: '#e5a3a3' },
  { label: 'Developing', pct: 25, color: '#eed9a0' },
  { label: 'Proficient', pct: 45, color: '#bfe3a8' },
  { label: 'Excellent', pct: 12, color: '#a9c8e8' },
];

function EcoDashboard() {
  return (
    <div className="rounded-2xl border border-line bg-paper shadow-soft overflow-hidden">
      <div className="grid sm:grid-cols-2">
        <div className="p-4 md:p-5">
          <div className="text-[12px] font-medium text-ink/50 mb-2.5">Your classes</div>
          <div className="space-y-2">
            {ECO_CLASSES.map(c => (
              <div key={c.name} className="rounded-xl border border-line px-3.5 py-2.5">
                <div className="text-[13px] font-medium">{c.name}</div>
                <div className="text-[12px] text-ink/50">{c.meta}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 md:p-5 bg-neutral/50 border-t sm:border-t-0 sm:border-l border-line">
          <div className="text-[12px] font-medium text-ink/50 mb-2.5">Class overview</div>
          <div className="mb-3">
            <span className="display text-[34px]">82%</span>
            <span className="text-[13px] text-ink/55"> average accuracy</span>
          </div>
          <div className="flex h-3.5 rounded-full overflow-hidden mb-2.5" aria-hidden="true">
            {ECO_BANDS.map(b => (
              <div key={b.label} style={{ width: `${b.pct}%`, background: b.color }} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {ECO_BANDS.map(b => (
              <div key={b.label} className="flex items-center gap-1.5 text-[11px] text-ink/60">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: b.color }} aria-hidden="true" />
                {b.pct}% {b.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const ECO_TILES = [
  { n: 'Year 8 Biology', s: '28 students', a: '82%' },
  { n: 'Year 9 Algebra', s: '31 students', a: '76%' },
  { n: 'Year 7 History', s: '26 students', a: '88%' },
  { n: 'Year 10 Physics', s: '24 students', a: '79%' },
];

function EcoClassTiles() {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {ECO_TILES.map(t => (
        <div key={t.n} className="rounded-2xl border border-line bg-paper p-3.5 shadow-soft">
          <div className="text-[13px] font-medium">{t.n}</div>
          <div className="text-[12px] text-ink/50 mb-1.5">{t.s}</div>
          <div className="display text-[26px]">{t.a}</div>
        </div>
      ))}
    </div>
  );
}

const ECO_TYPES = [
  { n: 'Multiple choice', d: 'Classic A–D options' },
  { n: 'True / False', d: 'Fast knowledge checks' },
  { n: 'Short answer', d: 'Free-text responses' },
  { n: 'Fill in the blank', d: 'Complete the sentence' },
  { n: 'Matching', d: 'Pair items together' },
  { n: 'AI draft', d: 'Generated for you' },
];

function EcoTypeTiles() {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {ECO_TYPES.map(t => (
        <div key={t.n} className="rounded-2xl border border-line bg-paper p-3.5 shadow-soft">
          <span className="block w-2 h-2 rounded-full bg-lime mb-2" aria-hidden="true" />
          <div className="text-[13px] font-medium">{t.n}</div>
          <div className="text-[12px] text-ink/50">{t.d}</div>
        </div>
      ))}
    </div>
  );
}

const ECO_BARS = [
  { q: 'Q1', pct: 96 },
  { q: 'Q2', pct: 81 },
  { q: 'Q3', pct: 63 },
  { q: 'Q4', pct: 89 },
];

function EcoGrading() {
  return (
    <div className="rounded-2xl border border-line bg-paper shadow-soft p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[14px] font-medium">Biology — Photosynthesis</div>
          <div className="text-[12px] text-ink/50">28 students · Graded automatically</div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold bg-lime/50 rounded-full px-2.5 py-1 shrink-0">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#444348" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 12.5l5 5L20 6.5" />
          </svg>
          Auto-graded
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        {[
          { l: 'Average', v: '82%' },
          { l: 'Completion', v: '94%' },
          { l: 'Questions', v: '10' },
        ].map(st => (
          <div key={st.l} className="rounded-xl bg-neutral/60 px-3 py-2.5">
            <div className="text-[11px] text-ink/50">{st.l}</div>
            <div className="display text-[22px]">{st.v}</div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {ECO_BARS.map(b => (
          <div key={b.q} className="grid grid-cols-[28px_1fr_44px] items-center gap-3">
            <span className="text-[13px] font-medium text-ink/60">{b.q}</span>
            <div className="h-2 rounded-full bg-neutral overflow-hidden">
              <div className="h-full rounded-full bg-lime" style={{ width: `${b.pct}%` }} />
            </div>
            <span className="text-[13px] font-medium text-right">{b.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Ecosystem() {
  return (
    <section className="bg-mist py-24 md:py-32">
      <div className={CONTAINER}>
        <Reveal>
          <h2 className="display text-4xl md:text-6xl text-center max-w-3xl mx-auto mb-14 md:mb-20">
            Unlock Qwizo&apos;s quiz ecosystem
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5 md:gap-6">
          <EcoCard
            large
            tint="bg-[#d9e7f9]"
            hover="hover:bg-[#c2d8f4]"
            lead="Every quiz has a home."
            link={{ label: 'Start creating free', href: '/signup' }}
            visual={<EcoDashboard />}
          >
            Create, edit, share and grade from one dashboard. Your classes, quizzes and
            results live together — no switching tools, no lost files.
          </EcoCard>
          <EcoCard
            tint="bg-[#eef3c4]"
            hover="hover:bg-[#e0e995]"
            lead="The platform your classes already use."
            link={{ label: 'How joining works', href: '#story-join' }}
            visual={<EcoClassTiles />}
          >
            With class overviews, per-class averages and results on top — everything a
            teacher needs, in one place.
          </EcoCard>
          <EcoCard
            tint="bg-[#e4eaf4]"
            hover="hover:bg-[#d2dcec]"
            lead="Six ways to ask, one place to keep them."
            link={{ label: 'Browse question types', href: '#question-types' }}
            visual={<EcoTypeTiles />}
          >
            Multiple choice, true/false, short answer and more — every type auto-graded,
            with AI ready to draft them.
          </EcoCard>
          <EcoCard
            large
            tint="bg-[#ccdffa]"
            hover="hover:bg-[#b3cef1]"
            lead="Grading that grades itself."
            link={{ label: 'See results', href: '#story-results' }}
            visual={<EcoGrading />}
          >
            Answers are graded on the server the moment students submit. Class averages,
            question accuracy and the hardest questions — instantly, for every quiz.
          </EcoCard>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 07b · Subjects ---------------- */

const EYEBROW = 'text-[8px] md:text-[9px] font-semibold tracking-[0.12em] text-ink/45 mb-1';

function MiniMCQ({ q, options, correct = 0 }: { q: string; options: string[]; correct?: number }) {
  return (
    <div className="bg-paper rounded-xl border border-line shadow-soft p-3 w-36 md:w-48">
      <div className={EYEBROW}>MULTIPLE CHOICE</div>
      <div className="text-[11px] md:text-[12px] font-medium mb-2 leading-snug">{q}</div>
      <div className="grid grid-cols-2 gap-1">
        {options.map((o, i) => (
          <div
            key={o}
            className={`rounded-md text-[10px] px-1.5 py-1 text-center truncate ${
              i === correct ? 'bg-lime/70 font-medium' : 'border border-line text-ink/70'
            }`}
          >
            {o}
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniTF({ s, answer }: { s: string; answer: boolean }) {
  return (
    <div className="bg-paper rounded-xl border border-line shadow-soft p-3 w-32 md:w-40">
      <div className={EYEBROW}>TRUE / FALSE</div>
      <div className="text-[11px] md:text-[12px] font-medium mb-2 leading-snug">{s}</div>
      <div className="grid grid-cols-2 gap-1">
        <div className={`rounded-md text-[10px] px-1.5 py-1 text-center ${answer ? 'bg-lime/70 font-medium' : 'border border-line text-ink/70'}`}>True</div>
        <div className={`rounded-md text-[10px] px-1.5 py-1 text-center ${!answer ? 'bg-lime/70 font-medium' : 'border border-line text-ink/70'}`}>False</div>
      </div>
    </div>
  );
}

function MiniShort({ prompt }: { prompt: string }) {
  return (
    <div className="bg-paper rounded-xl border border-line shadow-soft p-3 w-36 md:w-44">
      <div className={EYEBROW}>SHORT ANSWER</div>
      <div className="text-[11px] md:text-[12px] font-medium mb-2 leading-snug">{prompt}</div>
      <div className="rounded-md border border-dashed border-ink/25 text-[10px] text-ink/40 px-2 py-1.5">Type your answer…</div>
    </div>
  );
}

function MiniBlank({ before, blank, after, tint = 'bg-lime/60' }: { before: string; blank: string; after: string; tint?: string }) {
  return (
    <div className={`rounded-xl ${tint} shadow-soft p-3 w-32 md:w-40`}>
      <div className={EYEBROW}>FILL IN THE BLANK</div>
      <div className="text-[11px] md:text-[12px] font-medium leading-relaxed">
        {before}{' '}
        <span className="inline-block bg-paper rounded-md px-2 py-0.5 font-semibold border border-line">{blank}</span>{' '}
        {after}
      </div>
    </div>
  );
}

/** A collage fragment: cascades in on scroll, drifts on card hover. */
function CollageMini({
  base,
  order,
  className,
  spread,
  children,
}: {
  base: number;
  order: number;
  className: string;
  spread: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal className={className} delay={base + order * 70} y={14} duration={450}>
      <div className={`transition-transform duration-300 ease-qwizo ${spread}`}>{children}</div>
    </Reveal>
  );
}

const SUBJECTS: {
  card: string;
  name: string;
  span: string;
  keywords: string;
  visual: (base: number) => React.ReactNode;
}[] = [
  {
    card: '#EBF1BE', name: 'Mathematics', span: 'lg:col-span-4', keywords: 'math algebra',
    visual: (base: number) => (<>
      <CollageMini base={base} order={0} className="absolute left-2 top-2" spread="-rotate-3 group-hover:-translate-x-1.5 group-hover:-translate-y-1">
        <MiniMCQ q="15 × 24 = ?" options={['128', '246', '360', '180']} correct={3} /></CollageMini>
      <CollageMini base={base} order={1} className="absolute right-2 top-[36%]" spread="rotate-2 group-hover:translate-x-1.5 group-hover:-translate-y-0.5">
        <MiniTF s="Zero is an even number." answer={true} /></CollageMini>
      <CollageMini base={base} order={2} className="absolute left-3 bottom-2" spread="rotate-1 group-hover:-translate-x-1 group-hover:translate-y-1">
        <MiniBlank before="7 × 8 =" blank="56" after="" /></CollageMini>
    </>),
  },
  {
    card: '#FFE3C2', name: 'Science', span: 'lg:col-span-4', keywords: 'science',
    visual: (base: number) => (<>
      <CollageMini base={base} order={0} className="absolute left-2 top-2" spread="rotate-2 group-hover:-translate-x-1.5 group-hover:-translate-y-1">
        <MiniTF s="Water boils at 100°C." answer={true} /></CollageMini>
      <CollageMini base={base} order={1} className="absolute right-2 top-[36%]" spread="-rotate-2 group-hover:translate-x-1.5 group-hover:-translate-y-0.5">
        <MiniMCQ q="H₂O is…" options={['Water', 'Oxygen']} correct={0} /></CollageMini>
      <CollageMini base={base} order={2} className="absolute left-3 bottom-2" spread="-rotate-1 group-hover:-translate-x-1 group-hover:translate-y-1">
        <MiniShort prompt="Name one gas plants absorb." /></CollageMini>
    </>),
  },
  {
    card: '#E4DCF6', name: 'English', span: 'lg:col-span-4', keywords: 'english ela language arts',
    visual: (base: number) => (<>
      <CollageMini base={base} order={0} className="absolute left-2 top-2" spread="-rotate-2 group-hover:-translate-x-1.5 group-hover:-translate-y-1">
        <MiniShort prompt="Write a synonym for 'happy'." /></CollageMini>
      <CollageMini base={base} order={1} className="absolute right-2 top-[36%]" spread="rotate-3 group-hover:translate-x-1.5 group-hover:-translate-y-0.5">
        <MiniBlank before="She" blank="goes" after="to school." tint="bg-mist" /></CollageMini>
      <CollageMini base={base} order={2} className="absolute left-3 bottom-2" spread="rotate-2 group-hover:-translate-x-1 group-hover:translate-y-1">
        <MiniMCQ q="Synonym for 'happy'" options={['Joyful', 'Tired']} correct={0} /></CollageMini>
    </>),
  },
  {
    card: '#D3EAE6', name: 'History', span: 'lg:col-span-3', keywords: 'history social studies',
    visual: (base: number) => (<>
      <CollageMini base={base} order={0} className="absolute left-2 top-2" spread="rotate-3 group-hover:-translate-x-1.5 group-hover:-translate-y-1">
        <MiniMCQ q="WWII ended in…" options={['1945', '1939']} correct={0} /></CollageMini>
      <CollageMini base={base} order={1} className="absolute right-2 top-[36%]" spread="-rotate-3 group-hover:translate-x-1.5 group-hover:-translate-y-0.5">
        <MiniTF s="The Berlin Wall fell in 1989." answer={true} /></CollageMini>
      <CollageMini base={base} order={2} className="absolute left-3 bottom-2" spread="-rotate-1 group-hover:-translate-x-1 group-hover:translate-y-1">
        <MiniShort prompt="Name one cause of WWI." /></CollageMini>
    </>),
  },
  {
    card: '#D6E5F8', name: 'Geography', span: 'lg:col-span-3', keywords: 'geography',
    visual: (base: number) => (<>
      <CollageMini base={base} order={0} className="absolute left-2 top-2" spread="-rotate-3 group-hover:-translate-x-1.5 group-hover:-translate-y-1">
        <MiniMCQ q="Capital of Kyrgyzstan?" options={['Bishkek', 'Osh']} correct={0} /></CollageMini>
      <CollageMini base={base} order={1} className="absolute right-2 top-[36%]" spread="rotate-2 group-hover:translate-x-1.5 group-hover:-translate-y-0.5">
        <MiniBlank before="The" blank="Nile" after="is the longest river." tint="bg-sky/60" /></CollageMini>
      <CollageMini base={base} order={2} className="absolute left-3 bottom-2" spread="rotate-1 group-hover:-translate-x-1 group-hover:translate-y-1">
        <MiniTF s="The Pacific is the largest ocean." answer={true} /></CollageMini>
    </>),
  },
  {
    card: '#DDE1F5', name: 'Computer Science', span: 'lg:col-span-3', keywords: 'computer science cs coding',
    visual: (base: number) => (<>
      <CollageMini base={base} order={0} className="absolute left-2 top-2" spread="rotate-2 group-hover:-translate-x-1.5 group-hover:-translate-y-1">
        <MiniMCQ q="HTML is…" options={['HyperText', 'HighTech']} correct={0} /></CollageMini>
      <CollageMini base={base} order={1} className="absolute right-2 top-[36%]" spread="-rotate-2 group-hover:translate-x-1.5 group-hover:-translate-y-0.5">
        <MiniTF s="Python is an interpreted language." answer={true} /></CollageMini>
      <CollageMini base={base} order={2} className="absolute left-3 bottom-2" spread="-rotate-3 group-hover:-translate-x-1 group-hover:translate-y-1">
        <MiniBlank before="___ stores the" blank="RAM" after="running program." tint="bg-mist" /></CollageMini>
    </>),
  },
  {
    card: '#F8EACD', name: 'Physics', span: 'lg:col-span-3', keywords: 'physics',
    visual: (base: number) => (<>
      <CollageMini base={base} order={0} className="absolute left-2 top-2" spread="-rotate-2 group-hover:-translate-x-1.5 group-hover:-translate-y-1">
        <MiniBlank before="F =" blank="m" after="× a" /></CollageMini>
      <CollageMini base={base} order={1} className="absolute right-2 top-[36%]" spread="rotate-3 group-hover:translate-x-1.5 group-hover:-translate-y-0.5">
        <MiniMCQ q="Unit of force?" options={['Newton', 'Joule']} correct={0} /></CollageMini>
      <CollageMini base={base} order={2} className="absolute left-3 bottom-2" spread="rotate-2 group-hover:-translate-x-1 group-hover:translate-y-1">
        <MiniTF s="Light is faster than sound." answer={true} /></CollageMini>
    </>),
  },
  {
    card: '#CFECDC', name: 'Chemistry', span: 'lg:col-span-4', keywords: 'chemistry',
    visual: (base: number) => (<>
      <CollageMini base={base} order={0} className="absolute left-2 top-2" spread="rotate-3 group-hover:-translate-x-1.5 group-hover:-translate-y-1">
        <MiniMCQ q="Symbol for gold?" options={['Au', 'Ag']} correct={0} /></CollageMini>
      <CollageMini base={base} order={1} className="absolute right-2 top-[36%]" spread="-rotate-3 group-hover:translate-x-1.5 group-hover:-translate-y-0.5">
        <MiniTF s="H₂O is a compound." answer={true} /></CollageMini>
      <CollageMini base={base} order={2} className="absolute left-3 bottom-2" spread="-rotate-1 group-hover:-translate-x-1 group-hover:translate-y-1">
        <MiniBlank before="NaCl is" blank="table" after="salt." tint="bg-sky/60" /></CollageMini>
    </>),
  },
  {
    card: '#F9D8D2', name: 'Biology', span: 'lg:col-span-4', keywords: 'biology',
    visual: (base: number) => (<>
      <CollageMini base={base} order={0} className="absolute left-2 top-2" spread="-rotate-3 group-hover:-translate-x-1.5 group-hover:-translate-y-1">
        <MiniShort prompt="Name the powerhouse of the cell." /></CollageMini>
      <CollageMini base={base} order={1} className="absolute right-2 top-[36%]" spread="rotate-2 group-hover:translate-x-1.5 group-hover:-translate-y-0.5">
        <MiniMCQ q="Powerhouse of the cell?" options={['Mitochondria', 'Nucleus']} correct={0} /></CollageMini>
      <CollageMini base={base} order={2} className="absolute left-3 bottom-2" spread="rotate-1 group-hover:-translate-x-1 group-hover:translate-y-1">
        <MiniTF s="Humans have 46 chromosomes." answer={true} /></CollageMini>
    </>),
  },
  {
    card: '#FBFCFD', name: 'Languages', span: 'lg:col-span-4', keywords: 'languages foreign language spanish',
    visual: (base: number) => (<>
      <CollageMini base={base} order={0} className="absolute left-2 top-2" spread="rotate-2 group-hover:-translate-x-1.5 group-hover:-translate-y-1">
        <MiniMCQ q="'Hello' in Spanish?" options={['Hola', 'Adiós']} correct={0} /></CollageMini>
      <CollageMini base={base} order={1} className="absolute right-2 top-[36%]" spread="-rotate-2 group-hover:translate-x-1.5 group-hover:-translate-y-0.5">
        <MiniBlank before="___ means" blank="Gracias" after="'thank you'." tint="bg-mist" /></CollageMini>
      <CollageMini base={base} order={2} className="absolute left-3 bottom-2" spread="-rotate-3 group-hover:-translate-x-1 group-hover:translate-y-1">
        <MiniTF s="'Bonjour' is French." answer={true} /></CollageMini>
    </>),
  },
];

function Subjects() {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const list = SUBJECTS.filter(s => (s.name + ' ' + s.keywords).toLowerCase().includes(query));
  return (
    <section className="lime-wash py-24 md:py-32">
      <div className={CONTAINER}>
        <Reveal>
          <h2 className="display text-4xl md:text-6xl text-center text-ink max-w-3xl mx-auto mb-8 md:mb-10">
            Quizzes for <em>absolutely anything</em>
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <form
            className="max-w-xl mx-auto mb-12 md:mb-16"
            onSubmit={e => e.preventDefault()}
            role="search"
          >
            <div className="flex items-center gap-2 bg-paper rounded-full pl-5 pr-2 py-2 shadow-soft">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444348" strokeWidth="2" strokeLinecap="round" aria-hidden="true" opacity="0.55">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Find anything you need to teach"
                aria-label="Search subjects"
                className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-ink/40 min-w-0"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  aria-label="Clear search"
                  className="interact text-ink/45 hover:text-ink text-[13px] font-medium px-2"
                >
                  Clear
                </button>
              )}
              <button
                type="submit"
                aria-label="Search"
                className="interact w-11 h-11 rounded-full bg-ink inline-flex items-center justify-center shrink-0 hover:bg-[#55555a]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FBFCFD" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </form>
        </Reveal>
        {list.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-12 gap-4 md:gap-5">
            {list.map((s, i) => (
              <Reveal key={s.name} delay={Math.min(i, 9) * 60} y={16} className={s.span}>
                <button
                  type="button"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="interact group w-full h-full text-left rounded-[24px] p-3 md:p-4 flex flex-col border border-ink/10 shadow-soft hover:-translate-y-1 hover:shadow-lift"
                  style={{ background: s.card }}
                >
                  <div className="relative h-56 md:h-60 rounded-[18px] overflow-hidden bg-paper/70">
                    {s.visual(Math.min(i, 9) * 60)}
                  </div>
                  <div className="flex items-center justify-between px-1.5 pt-4 pb-1">
                    <span className="text-[17px] md:text-[20px] font-semibold tracking-tight">{s.name}</span>
                    <span className="relative w-9 h-9 rounded-full border border-ink/25 shrink-0 bg-paper/60 overflow-hidden transition-colors duration-300 group-hover:bg-lime group-hover:border-lime">
                      <svg className="absolute left-1/2 top-1/2 -ml-2 -mt-2 transition-all duration-300 ease-qwizo group-hover:translate-x-5 group-hover:-translate-y-5 group-hover:opacity-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444348" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M7 17L17 7M8 7h9v9" />
                      </svg>
                      <svg className="absolute left-1/2 top-1/2 -ml-2 -mt-2 -translate-x-5 translate-y-5 opacity-0 transition-all duration-300 ease-qwizo group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444348" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M7 17L17 7M8 7h9v9" />
                      </svg>
                    </span>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="text-center text-ink/60 text-[16px]">
            No subjects match “{q.trim()}” — try “math” or “science”.
          </p>
        )}
      </div>
    </section>
  );
}

/* ---------------- 08 · Final CTA ---------------- */

function FinalCta() {
  return (
    <section id="plans" className="blend-mist-paper pb-28">
      <div className={CONTAINER}>
        <Reveal>
        <div className="bg-ink text-white rounded-surface px-8 py-20 md:py-24 text-center relative overflow-hidden">
          <div className="absolute top-8 right-10 w-16 h-16 bg-lime rounded-2xl rotate-12 opacity-90 hidden md:block" />
          <div className="absolute bottom-10 left-12 w-10 h-10 bg-lime rounded-xl -rotate-12 opacity-60 hidden md:block" />
          <h2 className="h-section text-4xl md:text-6xl mb-5 relative">
            Your next quiz is closer<br />than you think.
          </h2>
          <p className="text-lg text-white/60 mb-9 relative">
            Free for teachers. Your first quiz takes minutes.
          </p>
          <Link to="/signup" className="relative">
            <Button variant="accent" size="lg">Create your first quiz <span className="btn-arrow">→</span></Button>
          </Link>
        </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className={`${CONTAINER} py-8 flex items-center justify-between`}>
        <QwizoLogo badge />
        <div className="flex items-center gap-6 text-[14px] text-ink/60">
          <a href="#features" className="hover:text-ink transition-colors">Features</a>
          <a href="#how" className="hover:text-ink transition-colors">How it works</a>
          <Link to="/login" className="hover:text-ink transition-colors">Log in</Link>
          <Link to="/signup" className="hover:text-ink transition-colors">Sign up</Link>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- Page ---------------- */

export function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />
      <Hero />
      <Problem />
      <QuestionTypes />
      <AiCreation />
      <Ecosystem />
      <Subjects />
      <div id="how" />
      <FinalCta />
      <Footer />
    </div>
  );
}
