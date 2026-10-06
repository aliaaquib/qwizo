// Qwizo official brand identity — the Arc.
// Single source of truth for the Qwizo logo. Do not create alternative marks.
//
// The mark: lime arc + secondary abstract blade + dot.
// Tones:
//   light      — lime arc, charcoal blade/dot, charcoal wordmark (light backgrounds)
//   dark       — lime arc, white blade/dot, white wordmark (dark backgrounds)
//   mono-black — entire mark + wordmark in charcoal
//   mono-white — entire mark + wordmark in white

export const QWIZO_LIME = '#E2EB5D';
export const QWIZO_INK = '#444348';

export type QwizoLogoTone = 'light' | 'dark' | 'mono-black' | 'mono-white';
export type QwizoLogoVariant = 'full' | 'mark';

function toneColors(tone: QwizoLogoTone): { arc: string; secondary: string; word: string } {
  switch (tone) {
    case 'dark':
      return { arc: QWIZO_LIME, secondary: '#FFFFFF', word: '#FFFFFF' };
    case 'mono-black':
      return { arc: QWIZO_INK, secondary: QWIZO_INK, word: QWIZO_INK };
    case 'mono-white':
      return { arc: '#FFFFFF', secondary: '#FFFFFF', word: '#FFFFFF' };
    case 'light':
    default:
      return { arc: QWIZO_LIME, secondary: QWIZO_INK, word: QWIZO_INK };
  }
}

/** Standalone Arc mark. */
export function QwizoMark({
  size = 32,
  tone = 'light',
  label = 'Qwizo logo',
}: {
  size?: number;
  tone?: QwizoLogoTone;
  label?: string;
}) {
  const c = toneColors(tone);
  // viewBox 200x170 — intrinsic aspect ratio of the mark
  return (
    <svg
      width={size * (200 / 170)}
      height={size}
      viewBox="0 0 200 170"
      fill="none"
      role="img"
      aria-label={label}
    >
      {/* lime arc */}
      <path
        d="M38 128 C56 86 94 60 134 56"
        stroke={c.arc}
        strokeWidth="31"
        strokeLinecap="round"
      />
      {/* secondary blade */}
      <path
        d="M92 88 C108 86 124 92 132 104 C138 114 138 128 134 140 C132 146 124 148 117 145 C105 140 94 130 89 118 C85 108 86 96 92 88 Z"
        fill={c.secondary}
      />
      {/* dot */}
      <circle cx="154" cy="78" r="14" fill={c.secondary} />
    </svg>
  );
}

/**
 * Canonical Qwizo logo — Arc mark + wordmark lockup.
 * Use `variant="mark"` for compact placements (favicon, app icon, student header).
 */
export function QwizoLogo({
  variant = 'full',
  tone = 'light',
  markSize = 30,
  className = '',
}: {
  variant?: QwizoLogoVariant;
  tone?: QwizoLogoTone;
  /** Height of the Arc mark in px; the wordmark scales with it. */
  markSize?: number;
  className?: string;
}) {
  const c = toneColors(tone);
  if (variant === 'mark') {
    return <QwizoMark size={markSize} tone={tone} />;
  }
  return (
    <span className={`inline-flex items-center ${className}`} style={{ gap: markSize * 0.32 }}>
      <QwizoMark size={markSize} tone={tone} />
      <span
        aria-hidden="true"
        style={{
          fontFamily: '"Poppins", "Inter", sans-serif',
          fontWeight: 700,
          fontSize: markSize * 0.82,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          color: c.word,
        }}
      >
        Qwizo
      </span>
    </span>
  );
}
