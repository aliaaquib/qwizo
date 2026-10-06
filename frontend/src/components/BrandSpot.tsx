import { useEffect, useState } from 'react';
import { QwizoMark } from '@/components/QwizoLogo';
import { usePrefersReducedMotion } from '@/components/motion';

// Qwizo brand spot — the original 12-second looping brand motion piece.
// Beat 1 (lime): the logo draws itself, the wordmark rises.
// Beat 2 (ink): the tagline enters word by word.
// Beat 3 (paper): editor, AI generation and share-code UI glide in.
// Beat 4 (lime): logo + "Start creating free", then loops.
// transform + opacity only. Freezes on a completed brand frame for reduced motion.

const DUR = 12000;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

const TAGLINE = ['Create', 'better', 'quizzes.', 'in', 'minutes,', 'not', 'hours.'];

/** Arc mark with a subtle entrance (scale + fade). The mark itself stays still. */
function ArcIntro({ size = 76, e }: { size?: number; e: number }) {
  return (
    <div style={{ opacity: Math.max(e, 0.15), transform: `scale(${0.92 + 0.08 * e})` }}>
      <QwizoMark size={size} tone="light" />
    </div>
  );
}

function Rise({ e, y = 18, children, className = '' }: { e: number; y?: number; children: React.ReactNode; className?: string }) {
  return (
    <div className={className} style={{ opacity: e, transform: `translateY(${(1 - e) * y}px)` }}>
      {children}
    </div>
  );
}

export function BrandSpot() {
  const reduced = usePrefersReducedMotion();
  const [t, setT] = useState(0);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setT((now - start) % DUR);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  // Beat windows (in × out)
  const b1 = seg(t, 0, 250) * (1 - seg(t, 2600, 3000));
  const b2 = seg(t, 3000, 3250) * (1 - seg(t, 5600, 6000));
  const b3 = seg(t, 6000, 6250) * (1 - seg(t, 8600, 9000));
  const b4 = seg(t, 9000, 9250) * (1 - seg(t, 11600, 12000));

  // Beat 1: logo entrance, wordmark rises
  const drawE = easeOut(seg(t, 300, 1300));
  const wordE = easeOut(seg(t, 1250, 1850));

  // Beat 2: tagline word by word
  const wordEs = TAGLINE.map((_, i) => easeOut(seg(t, 3400 + i * 230, 3700 + i * 230)));

  // Beat 3: product cards glide in
  const editorE = easeOut(seg(t, 6400, 6950));
  const aiE = easeOut(seg(t, 6950, 7500));
  const shareE = easeOut(seg(t, 7500, 8050));

  // Beat 4: outro
  const outroLogoE = easeOut(seg(t, 9300, 9850));
  const outroCtaE = easeOut(seg(t, 9850, 10450));

  if (reduced) {
    return (
      <div
        className="relative overflow-hidden rounded-card border border-line shadow-soft flex flex-col items-center justify-center gap-5"
        style={{ minHeight: 430, background: '#E2EB5D' }}
        role="img"
        aria-label="Qwizo — create better quizzes in minutes, not hours"
      >
        <QwizoMark size={76} tone="light" />
        <div className="text-4xl text-ink" style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700 }}>Qwizo</div>
        <div className="bg-ink text-white rounded-full px-7 py-3 text-[15px] font-medium">
          Start creating free
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-card border border-line bg-paper shadow-soft text-left"
      style={{ minHeight: 430 }}
      role="img"
      aria-label="Qwizo brand animation playing on loop"
    >
      {/* Beat 1 — lime opener */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5" style={{ opacity: b1, background: '#E2EB5D' }}>
        <ArcIntro e={drawE} />
        <Rise e={wordE}>
          <div className="text-4xl text-ink" style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' }}>Qwizo</div>
        </Rise>
      </div>

      {/* Beat 2 — ink tagline */}
      <div className="absolute inset-0 flex items-center justify-center px-10" style={{ opacity: b2, background: '#444348' }}>
        <div className="display text-4xl md:text-5xl text-center leading-tight" style={{ color: '#FBFCFD' }}>
          {TAGLINE.map((w, i) => (
            <span
              key={w + i}
              className="inline-block mr-[0.28em]"
              style={{ opacity: wordEs[i], transform: `translateY(${(1 - wordEs[i]) * 14}px)` }}
            >
              {w}
            </span>
          ))}
        </div>
      </div>

      {/* Beat 3 — product scene */}
      <div className="absolute inset-0 flex items-center justify-center gap-4 px-8" style={{ opacity: b3, background: '#FBFCFD' }}>
        <div
          className="bg-paper border border-line rounded-2xl shadow-soft p-5 w-56"
          style={{ opacity: editorE, transform: `translateX(${(1 - editorE) * -48}px)` }}
        >
          <div className="text-[13px] font-medium mb-3">Linear Equations</div>
          <div className="text-[12px] text-ink/60 mb-2">Q1 · Solve: 3x + 5 = 20</div>
          <div className="space-y-1.5">
            {['x = 3', 'x = 5', 'x = 7'].map(o => (
              <div key={o} className="text-[12px] border border-line rounded-control px-3 py-1.5">{o}</div>
            ))}
          </div>
        </div>
        <div
          className="bg-paper border border-line rounded-2xl shadow-soft p-5 w-52"
          style={{ opacity: aiE, transform: `translateX(${(1 - aiE) * 48}px)` }}
        >
          <div className="text-[13px] font-medium mb-3">AI draft</div>
          <div className="bg-neutral rounded-control px-3 py-2 text-[12px] text-ink/60 mb-3">Linear equations…</div>
          <div className="bg-ink text-white text-center text-[12px] font-medium rounded-full py-2">Generate quiz</div>
        </div>
        <div
          className="bg-paper border border-line rounded-2xl shadow-soft p-5 w-44"
          style={{ opacity: shareE, transform: `translateY(${(1 - shareE) * 40}px)` }}
        >
          <div className="text-[13px] font-medium mb-3">Share</div>
          <div className="font-mono text-lg tracking-widest text-center bg-neutral rounded-control py-2">BKCJ-8575</div>
        </div>
      </div>

      {/* Beat 4 — lime outro */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5" style={{ opacity: b4, background: '#E2EB5D' }}>
        <div style={{ opacity: outroLogoE, transform: `scale(${0.9 + 0.1 * outroLogoE})` }}>
          <QwizoMark size={76} tone="light" />
        </div>
        <Rise e={outroCtaE}>
          <div className="bg-ink text-white rounded-full px-7 py-3 text-[15px] font-medium">
            Start creating free
          </div>
        </Rise>
      </div>
    </div>
  );
}
