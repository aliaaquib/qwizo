import { useEffect, useRef, useState } from 'react';
import { QwizoMark } from '@/components/QwizoLogo';
import { usePrefersReducedMotion, useRevealOnce } from '@/components/motion';

// Why Qwizo — 18-second looping product story for the Why Qwizo video card.
// Scene 1 (0–4.2s):   the midnight grind — clock, paper stack, red pen.
// Scene 2 (4.2–9.5s):  AI drafts the quiz in seconds.
// Scene 3 (9.5–13s):   share a code, students join.
// Scene 4 (13–18s):    auto-graded results, logo outro.
// transform + opacity only. Click toggles play/pause. Static results frame for reduced motion.

const DUR = 18000;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

function Rise({ e, y = 16, children, className = '' }: { e: number; y?: number; children: React.ReactNode; className?: string }) {
  return (
    <div className={className} style={{ opacity: e, transform: `translateY(${(1 - e) * y}px)` }}>
      {children}
    </div>
  );
}

function Sparkle({ e, className = '' }: { e: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      style={{ opacity: e, transform: `scale(${0.4 + 0.6 * e}) rotate(${e * 40}deg)` }}
    >
      <path d="M12 2c.7 4.8 2.6 6.7 7.4 7.4-4.8.7-6.7 2.6-7.4 7.4-.7-4.8-2.6-6.7-7.4-7.4 4.8-.7 6.7-2.6 7.4-7.4z" fill="#E2EB5D" stroke="#444348" strokeWidth="1.4" />
    </svg>
  );
}

const CAPTIONS = [
  'Still writing quizzes at midnight?',
  'Qwizo drafts it in seconds.',
  'One code. No student accounts.',
  'Graded automatically.',
];

function Scene({ t, from, to, children }: { t: number; from: number; to: number; children: React.ReactNode }) {
  const e = seg(t, from, from + 400) * (to >= DUR ? 1 - seg(t, DUR - 500, DUR) : 1 - seg(t, to - 400, to));
  return (
    <div className="absolute inset-0" style={{ opacity: e, pointerEvents: e > 0.5 ? 'auto' : 'none' }}>
      {children}
    </div>
  );
}

export function WhyVideo() {
  const reduced = usePrefersReducedMotion();
  const { ref, visible } = useRevealOnce<HTMLDivElement>();
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const tRef = useRef(0);

  useEffect(() => {
    if (reduced || !playing || !visible) return;
    const start = performance.now() - tRef.current;
    let raf = 0;
    const tick = (now: number) => {
      tRef.current = (now - start) % DUR;
      setT(tRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, playing, visible]);

  if (reduced) {
    return (
      <div ref={ref} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-line bg-paper select-none">
        <ResultsScene t={16000} static />
      </div>
    );
  }

  const capIdx = t < 4200 ? 0 : t < 9500 ? 1 : t < 13000 ? 2 : t < 16000 ? 3 : -1;

  return (
    <div
      ref={ref}
      onClick={() => setPlaying(p => !p)}
      className="relative aspect-[4/3] rounded-xl overflow-hidden border border-line bg-paper select-none cursor-pointer"
      role="button"
      aria-label={playing ? 'Pause video' : 'Play video'}
    >
      <Scene t={t} from={0} to={4200}><GrindScene t={t} /></Scene>
      <Scene t={t} from={4200} to={9500}><GenerateScene t={t} /></Scene>
      <Scene t={t} from={9500} to={13000}><ShareScene t={t} /></Scene>
      <Scene t={t} from={13000} to={DUR}><ResultsScene t={t} /></Scene>

      {capIdx >= 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="inline-block bg-ink/85 text-paper text-[13px] font-medium rounded-full px-4 py-1.5 whitespace-nowrap">
            {CAPTIONS[capIdx]}
          </span>
        </div>
      )}

      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/[0.06]">
          <span className="inline-flex items-center gap-2.5 bg-lime rounded-full pl-2 pr-5 py-2 shadow-soft">
            <span className="w-9 h-9 rounded-full bg-ink flex items-center justify-center" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M4 2.5v9l7-4.5-7-4.5z" fill="#FBFCFD" />
              </svg>
            </span>
            <span className="font-medium text-[15px]">Play</span>
          </span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 h-[3px] bg-lime" style={{ width: `${(t / DUR) * 100}%` }} />
    </div>
  );
}

/* ---------------- Scene 1 · the grind ---------------- */

function GrindScene({ t }: { t: number }) {
  const minute = 47 + Math.floor(t / 1400); // 11:47 → 11:49
  const sheetE = [0, 1, 2].map(i => easeOut(seg(t, 300 + i * 220, 800 + i * 220)));
  const circleE = easeOut(seg(t, 2200, 3000));
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-6 md:gap-10 px-8">
      <div className="text-center">
        <Rise e={easeOut(seg(t, 200, 700))}>
          <div className="display text-5xl md:text-6xl tabular-nums">11:{minute}</div>
          <div className="text-[13px] font-medium tracking-[0.18em] text-ink/50 mt-1">PM</div>
        </Rise>
        <Rise e={easeOut(seg(t, 900, 1400))} className="mt-4">
          <span className="inline-block text-[12px] font-medium bg-[#F6E7D3] border border-line rounded-full px-3 py-1">
            Quiz due tomorrow
          </span>
        </Rise>
      </div>
      <div className="relative w-40 md:w-48 h-44">
        {sheetE.map((e, i) => (
          <div
            key={i}
            className="absolute inset-x-0 top-0 bottom-0 bg-paper border border-line rounded-lg shadow-soft p-4"
            style={{
              opacity: e,
              transform: `translateY(${(1 - e) * 14}px) rotate(${(i - 1) * 5}deg) translateX(${(i - 1) * 10}px)`,
            }}
          >
            {[0, 1, 2, 3].map(r => (
              <div key={r} className="h-[7px] rounded bg-ink/10 mb-2.5" style={{ width: `${88 - r * 12}%` }} />
            ))}
            {i === 2 && (
              <svg viewBox="0 0 120 60" className="absolute inset-x-4 top-3 h-12" aria-hidden="true">
                <ellipse
                  cx="60" cy="30" rx="46" ry="20" fill="none" stroke="#E2574C" strokeWidth="3"
                  pathLength={100} strokeDasharray={100} strokeDashoffset={100 * (1 - circleE)}
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Scene 2 · AI drafts ---------------- */

const GEN_QS = [
  { q: 'Which organelle makes energy?', opts: ['Nucleus', 'Mitochondria'] },
  { q: 'Plants absorb…', opts: ['Oxygen', 'CO₂'] },
  { q: 'H₂O is…', opts: ['Water', 'Acid'] },
];

function GenerateScene({ t }: { t: number }) {
  const promptE = easeOut(seg(t, 4400, 4900));
  const btnE = easeOut(seg(t, 5200, 5500));
  const btnPulse = 1 + 0.06 * Math.sin(((t - 5200) / 300) * Math.PI) * seg(t, 5200, 5800) * (1 - seg(t, 5800, 6200));
  const sparks = [0, 1, 2].map(i => easeOut(seg(t, 5900 + i * 140, 6300 + i * 140)) * (1 - seg(t, 6800, 7200)));
  const cardEs = GEN_QS.map((_, i) => easeOut(seg(t, 6400 + i * 420, 6950 + i * 420)));
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-sm" style={{ opacity: promptE, transform: `translateY(${(1 - promptE) * 12}px)` }}>
        <div className="flex items-center gap-2 bg-paper border border-line rounded-full pl-5 pr-2 py-2 shadow-soft">
          <span className="flex-1 text-[14px] font-medium truncate">Photosynthesis · Year 7 · 10 questions</span>
          <span
            className="inline-block bg-lime text-[13px] font-semibold rounded-full px-4 py-2"
            style={{ transform: `scale(${btnE * btnPulse})`, opacity: btnE }}
          >
            Generate
          </span>
        </div>
      </div>
      <div className="relative w-full max-w-sm h-8 mt-1">
        <Sparkle e={sparks[0]} className="absolute left-8 top-0 w-6 h-6" />
        <Sparkle e={sparks[1]} className="absolute left-1/2 top-1 w-8 h-8" />
        <Sparkle e={sparks[2]} className="absolute right-10 top-0 w-5 h-5" />
      </div>
      <div className="w-full max-w-sm space-y-2">
        {GEN_QS.map((g, i) => (
          <div
            key={g.q}
            className="bg-paper border border-line rounded-xl px-4 py-2.5 shadow-soft flex items-center justify-between gap-3"
            style={{ opacity: cardEs[i], transform: `translateY(${(1 - cardEs[i]) * 14}px)` }}
          >
            <span className="text-[13px] font-medium truncate">{g.q}</span>
            <span className="flex gap-1 shrink-0">
              {g.opts.map((o, j) => (
                <span key={o} className={`text-[11px] rounded-md px-2 py-1 ${j === 1 ? 'bg-lime/70 font-medium' : 'border border-line text-ink/60'}`}>
                  {o}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Scene 3 · share ---------------- */

const AVATARS = ['#D6E3F2', '#E2EB5D', '#F6E7D3', '#D3EAE6', '#E4DCF6'];

function ShareScene({ t }: { t: number }) {
  const codeE = easeOut(seg(t, 9700, 10200));
  const copiedE = seg(t, 10600, 10900);
  const joined = Math.round(24 * easeOut(seg(t, 10800, 12200)));
  const avEs = AVATARS.map((_, i) => easeOut(seg(t, 10600 + i * 160, 11100 + i * 160)));
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
      <div style={{ opacity: codeE, transform: `scale(${0.9 + 0.1 * codeE})` }}>
        <div className="flex items-center gap-3 bg-ink text-paper rounded-2xl px-6 py-4 shadow-soft">
          <span className="display text-3xl md:text-4xl tracking-[0.12em]">QWZ-4821</span>
          <span className="w-8 h-8 rounded-full bg-lime inline-flex items-center justify-center" aria-hidden="true">
            {copiedE > 0.5 ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444348" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12.5l5 5L20 6.5" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444348" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="12" height="12" rx="2.5" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
            )}
          </span>
        </div>
      </div>
      <div className="flex items-center mt-6">
        {AVATARS.map((c, i) => (
          <span
            key={c}
            className="w-10 h-10 rounded-full border-2 border-paper shadow-soft -ml-2 first:ml-0 inline-flex items-center justify-center text-[13px] font-semibold"
            style={{ background: c, opacity: avEs[i], transform: `scale(${avEs[i]})` }}
            aria-hidden="true"
          >
            {['AK', 'MS', 'JT', 'RP', 'LN'][i]}
          </span>
        ))}
        <span className="ml-3 text-[14px] font-medium tabular-nums">{joined} joined</span>
      </div>
    </div>
  );
}

/* ---------------- Scene 4 · results + outro ---------------- */

const BARS = [
  { label: 'Q1', v: 82 },
  { label: 'Q2', v: 64 },
  { label: 'Q3', v: 91 },
  { label: 'Q4', v: 73 },
];

function ResultsScene({ t, static: isStatic = false }: { t: number; static?: boolean }) {
  const tt = isStatic ? 16000 : t;
  const avg = Math.round(82 * easeOut(seg(tt, 13500, 15000)));
  const badgeE = easeOut(seg(tt, 14800, 15300));
  const outroE = isStatic ? 0 : seg(tt, 16300, 16800);
  const contentE = 1 - outroE;
  return (
    <div className="absolute inset-0 flex items-center justify-center px-8">
      <div className="w-full max-w-sm" style={{ opacity: contentE }}>
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="display text-5xl tabular-nums">{avg}%</div>
            <div className="text-[13px] text-ink/50 font-medium mt-1">average score</div>
          </div>
          <span
            className="inline-flex items-center gap-1.5 bg-lime/60 text-[12px] font-semibold rounded-full px-3 py-1.5"
            style={{ opacity: badgeE, transform: `scale(${0.85 + 0.15 * badgeE})` }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444348" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
            Auto-graded
          </span>
        </div>
        <div className="flex items-end gap-3 h-28">
          {BARS.map((b, i) => {
            const h = b.v * easeOut(seg(tt, 13200 + i * 160, 14000 + i * 160));
            return (
              <div key={b.label} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full h-24 bg-ink/[0.07] rounded-lg relative overflow-hidden">
                  <div
                    className="absolute bottom-0 inset-x-0 rounded-lg"
                    style={{ height: `${h}%`, background: i === 2 ? '#E2EB5D' : '#D6E3F2' }}
                  />
                </div>
                <span className="text-[11px] font-medium text-ink/50">{b.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      {outroE > 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-paper" style={{ opacity: outroE }}>
          <div style={{ transform: `scale(${0.85 + 0.15 * outroE})` }}>
            <QwizoMark size={64} tone="light" />
          </div>
          <div className="display text-2xl md:text-3xl">Start creating free.</div>
        </div>
      )}
    </div>
  );
}
